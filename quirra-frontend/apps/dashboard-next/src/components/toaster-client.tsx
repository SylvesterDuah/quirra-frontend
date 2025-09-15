// quirra-frontend/apps/dashboard-next/src/components/toaster-client.tsx

"use client";


import {Toaster} from "sonner";

export default function ToasterClient() {
    return (
        <Toaster 
        richColors
        position="top-right"
        closeButton
        duration={4000}
        theme="system"
         />
    );
}