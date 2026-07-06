import React from 'react';

interface MessageProps {
    message: string;
    type?: 'success' | 'error';
}

const Message: React.FC<MessageProps> = ({ message, type = 'success' }) => {
    if (!message) return null;

    return (
        <p className={`message ${type === 'error' ? 'error' : 'success'}`}>
            {message}
        </p>
    );
};

export default Message;