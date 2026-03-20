"use client";

import { useState, useEffect } from "react";
import { Info, HelpCircle } from "lucide-react";

declare global {
  interface Window {
    customConfirm: (message: string) => Promise<boolean>;
  }
}

type AlertItem = {
  id: string;
  message: string;
  type: "alert" | "confirm";
  resolve?: (value: boolean) => void;
};

export default function GlobalAlert() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    // Only patch window if it's not already patched 
    // (React StrictMode can run this twice)
    const originalAlert = window.alert;

    window.alert = (message: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setAlerts((prev) => [...prev, { id, message, type: "alert" }]);
    };

    window.customConfirm = (message: string) => {
      return new Promise<boolean>((resolve) => {
        const id = Math.random().toString(36).substring(2, 9);
        setAlerts((prev) => [...prev, { id, message, type: "confirm", resolve }]);
      });
    };

    return () => {
      window.alert = originalAlert;
      delete (window as any).customConfirm;
    };
  }, []);

  if (alerts.length === 0) return null;

  const handleClose = (id: string, result: boolean = false) => {
    setAlerts((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.resolve) {
        target.resolve(result);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {alerts.map((alertItem) => (
          <div
            key={alertItem.id}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200"
          >
            <div className="p-6 text-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  alertItem.type === "alert"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                {alertItem.type === "alert" ? (
                  <Info className="w-6 h-6" />
                ) : (
                  <HelpCircle className="w-6 h-6" />
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {alertItem.type === "alert" ? "Notification" : "Please Confirm"}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {alertItem.message}
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 justify-center border-t border-gray-100">
              {alertItem.type === "confirm" && (
                <button
                  onClick={() => handleClose(alertItem.id, false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors text-sm"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => handleClose(alertItem.id, true)}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-colors text-sm"
              >
                {alertItem.type === "confirm" ? "Confirm" : "OK"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
