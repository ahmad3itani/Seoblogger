"use client";

import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";

interface ErrorToastProps {
    message: string;
    onClose: () => void;
}

export function ErrorToast({ message, onClose }: ErrorToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
            <div className="glass-card rounded-xl p-4 pr-12 max-w-md border-red-500/30 bg-red-500/10 relative">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-sm mb-1">Error</h4>
                        <p className="text-sm text-muted-foreground">{message}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1 hover:bg-muted/20 rounded-md transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// Global error handler hook
export function useErrorHandler() {
    const [error, setError] = useState<string | null>(null);

    const handleError = (err: any) => {
        const message = err?.message || err?.error || "An unexpected error occurred";
        setError(message);
        console.error("Error:", err);
    };

    const clearError = () => setError(null);

    return { error, handleError, clearError };
}
