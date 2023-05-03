import React, { FunctionComponent, useCallback, useEffect } from 'react';

import {
    PaymentMethodProps,
    PaymentMethodResolveId,
    toResolvableComponent,
} from '@bigcommerce/checkout/payment-integration-api';

import { BraintreeAchPaymentForm } from './components';

const BraintreeAchPaymentMethod: FunctionComponent<PaymentMethodProps> = ({
    method,
    checkoutService,
    checkoutState,
    language,
    onUnhandledError,
    paymentForm,
}) => {
    const initializePayment = useCallback(
        async (mandateText?: string) => {
            const { gateway: gatewayId, id: methodId } = method;

            try {
                await checkoutService.initializePayment({
                    gatewayId,
                    methodId,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    braintreeach: {
                        mandateText,
                    },
                });
            } catch (error) {
                if (error instanceof Error) {
                    onUnhandledError(error);
                }
            }
        },
        [checkoutService, method, onUnhandledError],
    );

    useEffect(() => {
        void initializePayment();
    }, [initializePayment]);

    useEffect(() => {
        const initializeBillingAddressFields = async () => {
            try {
                await checkoutService.loadBillingAddressFields();
            } catch (error) {
                if (error instanceof Error) {
                    onUnhandledError(error);
                }
            }
        };

        void initializeBillingAddressFields();
    }, [checkoutService, onUnhandledError]);

    const props = {
        checkoutService,
        checkoutState,
        language,
        method,
        paymentForm,
        storeName: checkoutState.data.getConfig()?.storeProfile.storeName,
        outstandingBalance: checkoutState.data.getCheckout()?.outstandingBalance,
        initializePayment,
    };

    return <BraintreeAchPaymentForm {...props} />;
};

export default toResolvableComponent<PaymentMethodProps, PaymentMethodResolveId>(
    BraintreeAchPaymentMethod,
    [{ id: 'braintreeach' }],
);
