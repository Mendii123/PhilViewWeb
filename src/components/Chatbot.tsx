'use client';

import React, { useRef, useState } from 'react';
import type { User } from '@/types/user';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { MessageCircle, Send, X } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface ChatbotProps {
  currentUser: User | null;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onAction?: (action: { type: 'navigate'; target: string; payload?: Record<string, unknown> } | { type: 'logout' }) => void;
}

export function Chatbot({ currentUser, onNavigate, onLogout, onAction }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm Philip, your virtual assistant. How can I help you today?",
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const messageIdRef = useRef(1);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const [pendingPlan, setPendingPlan] = useState<
    | { kind: 'appointment'; data: { propertyId?: string; date?: string; time?: string } }
    | { kind: 'cancel_appointment'; data: { propertyName?: string; date?: string; time?: string } }
    | null
  >(null);

  const nextId = () => {
    messageIdRef.current += 1;
    return messageIdRef.current.toString();
  };

  const fallbackCommand = (
    input: string
  ): { action?: { type: 'navigate' | 'logout'; target?: string } } => {
    const text = input.toLowerCase();
    if (text.includes('logout') || text.includes('sign out')) {
      return { action: { type: 'logout' } };
    }
    if (text.includes('appointment')) {
      return { action: { type: 'navigate', target: 'appointments' } };
    }
    if (text.includes('balance')) {
      return { action: { type: 'navigate', target: 'balance' } };
    }
    if (text.includes('inquiry') || text.includes('inquiries')) {
      return { action: { type: 'navigate', target: 'inquiries' } };
    }
    if (text.includes('client')) {
      return { action: { type: 'navigate', target: 'clients' } };
    }
    if (text.includes('event')) {
      return { action: { type: 'navigate', target: 'events' } };
    }
    if (text.includes('property') || text.includes('browse')) {
      return { action: { type: 'navigate', target: 'properties' } };
    }
    if (text.includes('dashboard')) {
      return { action: { type: 'navigate', target: 'dashboard' } };
    }
    return {};
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: nextId(),
      text: inputText,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // If awaiting confirmation for a plan
    if (pendingPlan) {
      const lower = inputText.toLowerCase();
      const isYes = lower.includes('yes') || lower.includes('confirm') || lower.includes('do it') || lower.includes('go ahead');
      const isNo = lower.includes('no') || lower.includes('cancel') || lower.includes('stop');

      if (isYes) {
        executePendingPlan(pendingPlan);
        setPendingPlan(null);
        setInputText('');
        return;
      }

      if (isNo) {
        setPendingPlan(null);
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            text: 'Okay, cancelled that request.',
            isBot: true,
            timestamp: new Date(),
          },
        ]);
        setInputText('');
        scrollToBottomSoon();
        return;
      }
    }

    // Detect intent to schedule appointment
    const lower = inputText.toLowerCase();
    const wantsAppointment = lower.includes('appointment') || lower.includes('schedule');
    const wantsCancel = lower.includes('cancel') && lower.includes('appointment');

    if (wantsCancel) {
      const planText = [
        'Plan:',
        '1) Open Appointments page',
        '2) Find a pending appointment (by property/date/time if given)',
        '3) Remove it after your confirmation',
        'Type "yes" to proceed or "no" to cancel.',
      ].join('\n');

      setPendingPlan({ kind: 'cancel_appointment', data: {} });
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          text: planText,
          isBot: true,
          timestamp: new Date(),
        },
      ]);
      setInputText('');
      scrollToBottomSoon();
      return;
    }

    if (wantsAppointment) {
      const planText = [
        'Plan:',
        '1) Open Appointments page',
        '2) Fill property, date, and time',
        '3) Submit after your confirmation',
        'Type "yes" to proceed or "no" to cancel.',
      ].join('\n');

      setPendingPlan({ kind: 'appointment', data: {} });
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          text: planText,
          isBot: true,
          timestamp: new Date(),
        },
      ]);
      setInputText('');
      scrollToBottomSoon();
      return;
    }

    void sendToAgent(inputText);
    setInputText('');
  };

  const sendToAgent = async (text: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, user: currentUser }),
      });

      if (!response.ok) {
        throw new Error(`Chat API responded with ${response.status}`);
      }

      let data: { reply?: string; action?: { type: string; target?: string } };
      try {
        data = (await response.json()) as { reply?: string; action?: { type: string; target?: string } };
      } catch {
        data = { reply: 'Received an empty response. Using fallback routing.' };
      }

      const reply = data.reply ?? 'Noted.';

      if (data.action) {
        if (data.action.type === 'navigate' && data.action.target) {
          onNavigate(data.action.target);
          onAction?.({ type: 'navigate', target: data.action.target, payload: data.action });
        } else if (data.action.type === 'logout') {
          onLogout();
          onAction?.({ type: 'logout' });
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          text: reply,
          isBot: true,
          timestamp: new Date(),
        },
      ]);
      scrollToBottomSoon();
    } catch (error) {
      console.error('Chat error', error);
      const fallback = fallbackCommand(text);
      const reply =
        fallback.action?.type === 'navigate' && fallback.action.target
          ? `Navigating to ${fallback.action.target}.`
          : fallback.action?.type === 'logout'
            ? 'Signing you out.'
            : getBotResponse(text);

      if (fallback.action?.type === 'navigate' && fallback.action.target) {
        onNavigate(fallback.action.target);
        onAction?.({ type: 'navigate', target: fallback.action.target, payload: fallback.action });
      } else if (fallback.action?.type === 'logout') {
        onLogout();
        onAction?.({ type: 'logout' });
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          text: reply,
          isBot: true,
          timestamp: new Date(),
        },
      ]);
      scrollToBottomSoon();
    }
  };

  const executePendingPlan = (
    plan:
      | { kind: 'appointment'; data: { propertyId?: string; date?: string; time?: string } }
      | { kind: 'cancel_appointment'; data: { propertyName?: string; date?: string; time?: string } }
  ) => {
    const nonce = nextId();
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        text: plan.kind === 'cancel_appointment'
          ? 'Executing: opening Appointments to cancel a pending request.'
          : 'Executing: opening Appointments and prefilling details.',
        isBot: true,
        timestamp: new Date(),
      },
    ]);
    onNavigate('appointments');
    onAction?.({
      type: 'navigate',
      target: 'appointments',
      payload: {
        propertyId: 'propertyId' in plan.data ? plan.data.propertyId : undefined,
        date: plan.data.date,
        time: plan.data.time,
        autoSubmit: plan.kind === 'appointment',
        cancel: plan.kind === 'cancel_appointment' ? { propertyName: plan.data.propertyName, date: plan.data.date, time: plan.data.time } : undefined,
        nonce,
      },
    });
    scrollToBottomSoon();
  };

  const scrollToBottomSoon = () => {
    requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  const getBotResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('property') || lowerInput.includes('properties')) {
      return 'We have several amazing properties available including Skyline Residences in Makati, Garden Villas in Quezon City, and Metro Heights in Pasig. Would you like to know more about any specific property?';
    }

    if (lowerInput.includes('appointment') || lowerInput.includes('schedule')) {
      return "I can help you schedule an appointment to view our properties. Please let me know your preferred date and time, and which property you're interested in.";
    }

    if (lowerInput.includes('price') || lowerInput.includes('cost')) {
      return 'Our properties range from PHP 6.8M to PHP 12M depending on the location and features. I can provide detailed pricing information for specific properties.';
    }

    if (lowerInput.includes('financing') || lowerInput.includes('payment')) {
      return 'We offer flexible financing options including bank loans and in-house financing. Our team can help you find the best payment plan that suits your budget.';
    }

    if (lowerInput.includes('location') || lowerInput.includes('where')) {
      return 'Our properties are located in prime areas including Makati City, Quezon City, and Pasig City. All locations offer great accessibility and amenities.';
    }

    return currentUser
      ? 'Thanks! I can also navigate: say "go to dashboard", "open properties", "appointments", "balance", or "logout".'
      : 'Thanks! You can log in to access role dashboards, appointments, and balance.';
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg z-50 bg-[#2E5D9F] hover:bg-[#1B2C48]"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 max-w-[90vw] h-[28rem] max-h-[70vh] shadow-lg z-50 flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-base">Ask Philip</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-3 space-y-3 min-h-0">
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-3 pr-2 pb-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] p-2 rounded-lg ${
                    message.isBot
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))}
            <div ref={scrollAnchorRef} />
          </div>
        </ScrollArea>
        <div className="flex space-x-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} size="icon" className="shrink-0 bg-[#2E5D9F] hover:bg-[#1B2C48]">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
