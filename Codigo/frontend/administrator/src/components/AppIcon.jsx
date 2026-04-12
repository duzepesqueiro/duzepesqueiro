import React from 'react';
import * as LucideIcons from 'lucide-react';
import { HelpCircle } from 'lucide-react';

function Icon({
    name,
    size = 24,
    color = "currentColor",
    className = "",
    strokeWidth = 2,
    ...props
}) {
    // Custom brand icon support: WhatsApp
    if (name === 'WhatsApp') {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
                {...props}
            >
                <circle cx="12" cy="12" r="11" fill="#25D366" />
                <path
                    d="M8.5 7.5c.5-1 1.5-1 2 0l.8 1.6c.3.6.1 1.2-.4 1.6l-.3.2c.9 1.6 2.1 2.8 3.7 3.7l.2-.3c.4-.5 1-.7 1.6-.4l1.6.8c1 .5 1 .5 0 2-.3.5-.8.8-1.4.8-5.1 0-9.5-4.4-9.5-9.5 0-.6.3-1.1.7-1.5Z"
                    fill="#fff"
                />
            </svg>
        );
    }

    const IconComponent = LucideIcons?.[name];

    if (!IconComponent) {
        return <HelpCircle size={size} color="gray" strokeWidth={strokeWidth} className={className} {...props} />;
    }

    return <IconComponent
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        className={className}
        {...props}
    />;
}
export default Icon;