import React from 'react';

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
                                                           size = 'medium',
                                                           text = 'Загрузка...'
                                                       }) => {
    return (
        <div className={`loading-spinner loading-${size}`}>
            <div className="spinner"></div>
            {text && <p>{text}</p>}
        </div>
    );
};

export default LoadingSpinner;