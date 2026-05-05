import { Mail, MessageCircle, Plus, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendInvite } from "../hooks/invite";
import { Formik, Form, Field, FieldArray, ErrorMessage } from "formik";
import * as Yup from "yup";

const handleApiError = (error, customMessage = "An unexpected error occurred.") => {
    if (error.response) {
        toast.error(error.response.data.message || customMessage);
    } else {
        toast.error("A network error occurred. Please check your connection.");
    }
};

const whatsappCountries = [
    { code: "+92", label: "Pakistan (+92)", minLength: 10, maxLength: 10 },
    { code: "+1", label: "United States / Canada (+1)", minLength: 10, maxLength: 10 },
    { code: "+44", label: "United Kingdom (+44)", minLength: 10, maxLength: 10 },
    { code: "+971", label: "UAE (+971)", minLength: 9, maxLength: 9 },
    { code: "+966", label: "Saudi Arabia (+966)", minLength: 9, maxLength: 9 },
    { code: "+91", label: "India (+91)", minLength: 10, maxLength: 10 },
];

const getWhatsappCountry = (countryCode) =>
    whatsappCountries.find((country) => country.code === countryCode) || whatsappCountries[0];

const AddUsers = ({ onInviteSuccess }) => {
    const [inviteMethod, setInviteMethod] = useState("email");
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: sendInvite,
        onSuccess: (data) => {
            data.results.forEach(result => {
                toast.info(`${result.contact}: ${result.status}`);
            });

            const whatsappLinks = data.results
                .filter((result) => result.whatsappUrl)
                .map((result) => result.whatsappUrl);

            if (whatsappLinks.length > 0) {
                whatsappLinks.forEach((url) => {
                    const popup = window.open(url, "_blank", "noopener,noreferrer");
                    if (!popup) {
                        toast.error("Allow pop-ups to open all WhatsApp invitations.");
                    }
                });
            }

            queryClient.invalidateQueries({ queryKey: ["pendingInvites"] })
            queryClient.invalidateQueries({ queryKey: ["sentRequests"] });

            if (onInviteSuccess) {
                onInviteSuccess();
            }
        },
        onError: (error) => handleApiError(error, "Something went wrong while sending invites."),
    });

    const emailValidationSchema = Yup.object({
        emails: Yup.array()
            .of(Yup.string().trim().email("Invalid email").required("Email is required"))
            .min(1, "At least one email is required"),
    });

    const whatsappValidationSchema = Yup.object({
        countryCode: Yup.string().required("Country code is required"),
        phoneNumbers: Yup.array()
            .of(Yup.string().required("WhatsApp number is required"))
            .min(1, "At least one WhatsApp number is required"),
    });

    const initialValues = {
        emails: [""],
        countryCode: whatsappCountries[0].code,
        phoneNumbers: [""],
    };

    return (
        <div className="flex justify-center items-center pt-2">
            <div className="bg-[#F6F9FC] shadow-sm rounded-2xl px-3 py-6 sm:p-8 w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden">
                <h2 className="text-xl sm:text-2xl p-bold text-[#6667DD] text-center pb-4 shrink-0">
                    Invite Friends to Your Finantic
                </h2>
                <div className="mb-6 border-b border-blue-200 pb-6 shrink-0">
                    <div className="mb-4 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setInviteMethod("email")}
                            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm p-medium transition-all duration-300 cursor-pointer ${inviteMethod === "email" ? "border-[#6667DD] bg-[#6667DD] text-white" : "border-blue-200 bg-white text-[#6667DD]"}`}
                        >
                            <Mail size={16} /> Via Email
                        </button>
                        <button
                            type="button"
                            onClick={() => setInviteMethod("whatsapp")}
                            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm p-medium transition-all duration-300 cursor-pointer ${inviteMethod === "whatsapp" ? "border-green-600 bg-green-600 text-white" : "border-green-200 bg-white text-green-700"}`}
                        >
                            <MessageCircle size={16} /> Via WhatsApp
                        </button>
                    </div>

                    <p className="text-gray-600 text-sm text-center">
                        {inviteMethod === "email"
                            ? "Send email invitations to connect and collaborate on financial transactions seamlessly."
                            : "Send professional WhatsApp invitations with a secure registration link."}
                    </p>
                </div>

                <Formik
                    initialValues={initialValues}
                    validationSchema={inviteMethod === "email" ? emailValidationSchema : whatsappValidationSchema}
                    validate={(values) => {
                        if (inviteMethod !== "whatsapp") {
                            return {};
                        }

                        const selectedCountry = getWhatsappCountry(values.countryCode);
                        const phoneErrors = values.phoneNumbers.map((phoneNumber) => {
                            const digitsOnly = (phoneNumber || "").replace(/\D/g, "");

                            if (!digitsOnly) {
                                return "WhatsApp number is required";
                            }

                            if (digitsOnly.length < selectedCountry.minLength || digitsOnly.length > selectedCountry.maxLength) {
                                return "Invalid number for selected country code";
                            }

                            return undefined;
                        });

                        return phoneErrors.some(Boolean) ? { phoneNumbers: phoneErrors } : {};
                    }}
                    onSubmit={(values, { resetForm }) => {
                        if (inviteMethod === "email") {
                            mutate(
                                {
                                    channel: "email",
                                    emails: values.emails.map((email) => email.trim()).filter(Boolean),
                                },
                                {
                                    onSuccess: () => resetForm({ values: initialValues }),
                                }
                            );
                            return;
                        }

                        const selectedCountry = getWhatsappCountry(values.countryCode);
                        const normalizedPhoneNumbers = values.phoneNumbers
                            .map((phoneNumber) => {
                                const localNumber = phoneNumber.replace(/\D/g, "");
                                return `${selectedCountry.code}${localNumber}`;
                            })
                            .filter((phoneNumber) => phoneNumber !== selectedCountry.code);

                        mutate(
                            {
                                channel: "whatsapp",
                                phoneNumbers: normalizedPhoneNumbers,
                            },
                            {
                                onSuccess: () =>
                                    resetForm({
                                        values: {
                                            ...initialValues,
                                            countryCode: values.countryCode,
                                        },
                                    }),
                            }
                        );
                    }}
                >
                    {({ values, errors, touched, isValid, dirty }) => {
                        return (
                            <Form className="flex flex-col overflow-hidden flex-1">
                                {inviteMethod === "whatsapp" && (
                                    <div className="flex flex-col shrink-0 mb-4">
                                        <label className="mb-1 text-sm p-medium text-gray-700">Country Code</label>
                                        <Field
                                            as="select"
                                            name="countryCode"
                                            disabled={isPending}
                                            className="p-regular w-full rounded-lg border-2 border-[#6667DD] px-4 py-2 text-sm text-gray-700 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                        >
                                            {whatsappCountries.map((country) => (
                                                <option key={country.code} value={country.code}>
                                                    {country.label}
                                                </option>
                                            ))}
                                        </Field>
                                        <ErrorMessage
                                            name="countryCode"
                                            component="div"
                                            className="text-red-500 text-sm mt-1 p-regular"
                                        />
                                    </div>
                                )}

                                <FieldArray name={inviteMethod === "email" ? "emails" : "phoneNumbers"}>
                                    {({ push }) => (
                                        <div className="flex flex-col flex-1 overflow-hidden">
                                            {/* Scrollable Container for Inputs ONLY */}
                                            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                                                {(inviteMethod === "email" ? values.emails : values.phoneNumbers).map((value, index) => (
                                                    <div key={index} className="flex flex-col">
                                                        <Field
                                                            type={inviteMethod === "email" ? "email" : "tel"}
                                                            name={`${inviteMethod === "email" ? "emails" : "phoneNumbers"}.${index}`}
                                                            placeholder={inviteMethod === "email" ? `Friend's Email ${index + 1}` : `WhatsApp Number ${index + 1}`}
                                                            disabled={isPending}
                                                            className={`p-regular w-full px-4 py-2 rounded-lg outline-none text-gray-700 text-sm sm:text-base disabled:bg-gray-100 disabled:text-gray-500 border-2 ${(inviteMethod === "email" ? errors.emails?.[index] && touched.emails?.[index] : errors.phoneNumbers?.[index] && touched.phoneNumbers?.[index])
                                                                ? "border-red-500"
                                                                : "border-[#6667DD]"
                                                                }`}
                                                        />
                                                        {inviteMethod === "whatsapp" && (
                                                            <p className="mt-1 text-xs text-gray-500 p-regular">
                                                                Enter the number without the country prefix.
                                                            </p>
                                                        )}
                                                        <ErrorMessage
                                                            name={`${inviteMethod === "email" ? "emails" : "phoneNumbers"}.${index}`}
                                                            component="div"
                                                            className="text-red-500 text-sm mt-1 p-regular"
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Action Buttons: Fixed outside the scrollable area */}
                                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-[#F6F9FC] pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => push("")}
                                                    disabled={isPending}
                                                    className="flex items-center justify-center gap-2 flex-1 py-2 rounded-lg bg-gradient-to-r from-[#6667DD] to-[#7C81F8] text-white p-medium hover:scale-97 transition-all duration-300 cursor-pointer w-full text-sm sm:text-base disabled:opacity-70"
                                                >
                                                    <Plus size={18} /> Add Another
                                                </button>

                                                <button
                                                    type="submit"
                                                    disabled={isPending || !isValid || !dirty}
                                                    className={`flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-white p-medium transition-all duration-300 cursor-pointer hover:scale-97 w-full text-sm sm:text-base ${isPending || !isValid || !dirty
                                                        ? "bg-green-300 hover:cursor-not-allowed"
                                                        : "bg-green-500 hover:bg-green-600"
                                                        }`}
                                                >
                                                    <Send size={18} /> {isPending ? "Sending..." : "Send Invites"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </FieldArray>

                                <p className="pt-3 text-center text-xs uppercase tracking-wider text-[#6667DD] p-semibold shrink-0">
                                    Powered by Techxudo
                                </p>
                            </Form>
                        );
                    }}
                </Formik>
            </div>
        </div>
    );
};

export default AddUsers;