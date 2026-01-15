import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { RotateCcw, Check, X } from 'lucide-react';

export default function SignaturePad({
    onSave,
    onClear,
    width = 600,
    height = 200,
    penColor = '#000000',
    backgroundColor = '#ffffff',
    disabled = false
}) {
    const sigCanvas = useRef(null);
    const [isEmpty, setIsEmpty] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Detect mobile device
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

        // Set canvas background
        if (sigCanvas.current) {
            const canvas = sigCanvas.current.getCanvas();
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }, [backgroundColor]);

    const handleClear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();

            // Redraw background
            const canvas = sigCanvas.current.getCanvas();
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            setIsEmpty(true);
            if (onClear) onClear();
        }
    };

    const handleSave = () => {
        if (sigCanvas.current && !isEmpty) {
            // Get signature as base64 PNG
            const signatureData = sigCanvas.current.toDataURL('image/png');
            if (onSave) onSave(signatureData);
        }
    };

    const handleEnd = () => {
        if (sigCanvas.current) {
            setIsEmpty(sigCanvas.current.isEmpty());
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            maxWidth: `${width}px`
        }}>
            {/* Canvas Container */}
            <div style={{
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
                background: backgroundColor,
                position: 'relative',
                touchAction: 'none' // Prevent scrolling on mobile
            }}>
                <SignatureCanvas
                    ref={sigCanvas}
                    canvasProps={{
                        width: width,
                        height: height,
                        className: 'signature-canvas',
                        style: {
                            width: '100%',
                            height: 'auto',
                            touchAction: 'none'
                        }
                    }}
                    penColor={penColor}
                    onEnd={handleEnd}
                    disabled={disabled}
                />

                {/* Placeholder text when empty */}
                {isEmpty && !disabled && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#9ca3af',
                        fontSize: '14px',
                        pointerEvents: 'none',
                        textAlign: 'center'
                    }}>
                        {isMobile ? 'Sign with your finger' : 'Sign with your mouse'}
                    </div>
                )}
            </div>

            {/* Controls */}
            {!disabled && (
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="btn btn-secondary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '14px',
                            padding: '8px 16px'
                        }}
                    >
                        <RotateCcw size={16} />
                        Clear
                    </button>

                    {onSave && (
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isEmpty}
                            className="btn btn-primary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '14px',
                                padding: '8px 16px'
                            }}
                        >
                            <Check size={16} />
                            Save Signature
                        </button>
                    )}
                </div>
            )}

            {/* Helper text */}
            <div style={{
                fontSize: '12px',
                color: '#6b7280',
                textAlign: 'center'
            }}>
                {isEmpty ? (
                    'Draw your signature above'
                ) : (
                    '✓ Signature captured'
                )}
            </div>
        </div>
    );
}
