import { motion } from 'framer-motion';

export default function LoadingSpinner({ size = 'md', className = '' }) {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <motion.div
                className={`${sizes[size]} relative`}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
                <motion.div
                    className="absolute inset-0 border-4 border-blue-200 dark:border-blue-900 rounded-full"
                />
                <motion.div
                    className="absolute inset-0 border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className="absolute inset-2 border-4 border-transparent border-t-purple-600 dark:border-t-purple-400 rounded-full"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                />
            </motion.div>
        </div>
    );
}
