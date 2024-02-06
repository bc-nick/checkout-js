import {
    AccountInstrument,
    HostedInstrument,
    PayPalCommerceAlternativeMethodsPaymentOptions,
    PayPalCommerceCreditPaymentInitializeOptions,
    PayPalCommercePaymentInitializeOptions,
    PayPalCommerceVenmoPaymentInitializeOptions,
} from '@bigcommerce/checkout-sdk';
import React, { FunctionComponent, useEffect, useRef } from 'react';

import { PaymentMethodProps } from '@bigcommerce/checkout/payment-integration-api';

type PayPalCommerceProvidersPaymentInitializeOptions =
    PayPalCommerceAlternativeMethodsPaymentOptions &
        PayPalCommerceCreditPaymentInitializeOptions &
        PayPalCommercePaymentInitializeOptions &
        PayPalCommerceVenmoPaymentInitializeOptions;

interface PayPalCommercePaymentMethodComponentProps {
    providerOptionsKey: string;
    providerOptionsData?: Partial<PayPalCommerceProvidersPaymentInitializeOptions>;
    currentInstrument?: AccountInstrument;
}

interface ButtonActions {
    disable: () => void;
    enable: () => void;
}

const PayPalCommercePaymentMethodComponent: FunctionComponent<
    PaymentMethodProps & PayPalCommercePaymentMethodComponentProps
> = ({
    method,
    checkoutService,
    paymentForm,
    onUnhandledError,
    providerOptionsKey,
    providerOptionsData,
    children,
    currentInstrument,
    language,
}) => {
    const buttonActionsRef = useRef<ButtonActions | null>(null);
    const shouldSaveInstrumentRef = useRef(false);
    const renderButtonRef = useRef<(() => void) | null>(null);

    const termsValue = paymentForm.getFieldValue('terms');
    const shouldSaveInstrument = paymentForm.getFieldValue('shouldSaveInstrument');

    const validateForm = async () => {
        const validationErrors = await paymentForm.validateForm();

        return Object.keys(validationErrors);
    };

    const validateButton = async () => {
        if (!buttonActionsRef.current) return;

        const keysValidation = await validateForm();

        if (keysValidation.length) {
            buttonActionsRef.current.disable();
        } else {
            buttonActionsRef.current.enable();
        }
    };

    useEffect(() => {
        if (currentInstrument) {
            paymentForm.hidePaymentSubmitButton(method, false);
        } else {
            paymentForm.hidePaymentSubmitButton(method, true);
            setTimeout(() => renderButtonRef.current?.(), 0);
        }
    }, [currentInstrument]);

    useEffect(() => {
        void validateButton();
    }, [termsValue]);

    useEffect(() => {
        shouldSaveInstrumentRef.current = Boolean(shouldSaveInstrument);
    }, [shouldSaveInstrument]);

    const initializePayment = async () => {
        try {
            await checkoutService.initializePayment({
                gatewayId: method.gateway,
                methodId: method.id,
                [providerOptionsKey]: {
                    container: '#checkout-payment-continue',
                    onInit: (onRenderButton: () => void) => {
                        renderButtonRef.current = onRenderButton;
                    },
                    submitForm: () => {
                        paymentForm.setSubmitted(true);
                        paymentForm.submitForm();
                    },
                    onError: (error: Error) => {
                        paymentForm.disableSubmit(method, true);

                        if (error.message === 'INSTRUMENT_DECLINED') {
                            onUnhandledError(new Error(language.translate('payment.errors.instrument_declined')));
                        } else {
                            onUnhandledError(error);
                        }
                    },
                    onValidate: async (
                        resolve: (hostedInstrumentValues?: HostedInstrument) => void,
                        reject: () => void,
                    ): Promise<void> => {
                        const keysValidation = await validateForm();

                        if (keysValidation.length) {
                            paymentForm.setSubmitted(true);
                            keysValidation.forEach((key) => paymentForm.setFieldTouched(key));

                            return reject();
                        }

                        return resolve({
                            shouldSaveInstrument: shouldSaveInstrumentRef.current,
                        });
                    },
                    onInitButton: async (actions: ButtonActions) => {
                        buttonActionsRef.current = actions;
                        await validateButton();
                    },
                    ...(providerOptionsData || {}),
                },
            });
        } catch (error) {
            if (error instanceof Error) {
                onUnhandledError(error);
            }
        }
    };

    const deinitializePayment = async () => {
        try {
            await checkoutService.deinitializePayment({
                gatewayId: method.gateway,
                methodId: method.id,
            });
        } catch (error) {
            if (error instanceof Error) {
                onUnhandledError(error);
            }
        }
    };

    useEffect(() => {
        void initializePayment();

        return () => {
            void deinitializePayment();
        };
    }, []);

    return children ? <div className='paypalCommercePaymentMethodComponent'>{children}</div> : <></>;
};

export default PayPalCommercePaymentMethodComponent;
