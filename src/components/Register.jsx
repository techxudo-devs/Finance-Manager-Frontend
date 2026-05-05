import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppContext } from '../../context/AppContext';
import { EyeOff, Eye } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { jwtDecode } from "jwt-decode"

const Register = () => {
    const { setUser } = useAppContext();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const inviteTokenFromUrl = searchParams.get('token') || '';
    const API_URL = import.meta.env.VITE_API_URL;
    const [prefilledInviteEmail, setPrefilledInviteEmail] = useState("");

    const initialValues = {
        name: '',
        email: prefilledInviteEmail,
        password: '',
        inviteToken: inviteTokenFromUrl,
    };

    const validationSchema = Yup.object({
        name: Yup.string().required("Name is required"),
        email: Yup.string().email("Invalid email address").required("Email is required"),
        password: Yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
    });

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("name", values.name);
            formData.append("email", values.email);
            formData.append("password", values.password);
            if (values.inviteToken) {
                formData.append("token", values.inviteToken);
            }

            const res = await fetch(`${API_URL}/api/register`, {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Something went wrong!");
            }

            toast.success(data.message || "Registered successfully!");
            setUser(data.user);
            localStorage.setItem("user", JSON.stringify(data.user));
            localStorage.setItem("token", data.token);
            navigate("/");

        } catch (error) {
            toast.error(error.message || "Something went wrong!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex items-center justify-center min-h-screen px-4 sm:px-6 md:px-10 overflow-hidden">

            <div className="absolute top-10 left-5 sm:left-10 w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-gradient-to-r from-[#6667DD] to-[#FFCE56] opacity-30 animate-bounce-slow"></div>
            <div className="absolute top-1/4 right-10 sm:right-20 w-20 sm:w-28 h-20 sm:h-28 rounded-full bg-gradient-to-r from-[#FFCE56] to-[#36A2EB] opacity-25 animate-bounce-medium"></div>
            <div className="absolute bottom-32 left-1/4 sm:left-1/3 w-16 sm:w-24 h-16 sm:h-24 rounded-full bg-gradient-to-r from-[#36A2EB] to-[#6667DD] opacity-20 animate-bounce-fast"></div>
            <div className="absolute bottom-10 right-1/4 w-24 sm:w-32 h-24 sm:h-32 rounded-full bg-gradient-to-r from-[#FF6384] to-[#6667DD] opacity-15 animate-bounce-slower"></div>
            <div className="absolute top-1/2 left-10 sm:left-30 w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-gradient-to-r from-[#36A2EB] to-[#FFCE56] opacity-20 animate-bounce-medium"></div>
            <div className="absolute bottom-0 right-1/2 sm:right-3/4 w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-gradient-to-r from-[#FF6384] to-[#36A2EB] opacity-25 animate-bounce-slow"></div>

            <div className="w-full max-w-md sm:max-w-xl md:max-w-4xl bg-[#F6F9FC] p-4 sm:p-8 md:p-10 my-4 sm:my-0 rounded-xl shadow-md relative z-10">
                <h1 className="text-[#6667DD] text-2xl sm:text-3xl p-bold mb-6 sm:mb-8 text-center">
                    Register into Finantic
                </h1>

                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                    enableReinitialize={true}
                >
                    {({ setFieldValue, errors, touched }) => {
                        useEffect(() => {
                            if (inviteTokenFromUrl) {
                                try {
                                    const decodedToken = jwtDecode(inviteTokenFromUrl);
                                    if (decodedToken.email) {
                                        setPrefilledInviteEmail(decodedToken.email);
                                        setFieldValue('email', decodedToken.email);
                                    } else {
                                        setPrefilledInviteEmail("");
                                        setFieldValue('email', "");
                                    }
                                } catch (error) {
                                    console.error("Invalid token:", error);
                                    toast.error("The invite link is invalid or has expired.");
                                    navigate("/register");
                                }
                            } else {
                                setPrefilledInviteEmail("");
                                setFieldValue('email', "");
                            }
                        }, [inviteTokenFromUrl, setFieldValue, navigate]);

                        return (

                            <Form className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                {/* Row 1 */}
                                <div className="flex flex-col">
                                    <label className="text-gray-700 p-medium mb-1">Name</label>
                                    <Field name="name" placeholder="Enter your full name" disabled={loading} className={`w-full px-3 py-2 border rounded-lg outline-none p-regular text-sm sm:text-base ${errors.name && touched.name ? 'border-red-500' : 'border-[#6667DD]'}`} />
                                    <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-gray-700 p-medium mb-1">Email</label>
                                    <Field type="email" name="email" placeholder="Enter your email" readOnly={!!prefilledInviteEmail}
                                        className={`w-full px-3 py-2 border rounded-lg outline-none p-regular text-sm sm:text-base ${errors.email && touched.email ? 'border-red-500' : 'border-[#6667DD]'} ${prefilledInviteEmail ? 'bg-gray-200 cursor-not-allowed' : ''}`} />
                                    <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
                                </div>

                                {/* Row 2 */}
                                <div className="flex flex-col relative">
                                    <label className="text-gray-700 p-medium mb-1">Password</label>
                                    <Field type={showPassword ? "text" : "password"} name="password" placeholder="Enter your password" disabled={loading} className={`w-full px-3 py-2 border rounded-lg outline-none p-regular text-sm sm:text-base pr-10 ${errors.password && touched.password ? 'border-red-500' : 'border-[#6667DD]'}`} />
                                    <ErrorMessage name="password" component="div" className="text-red-500 text-sm mt-1" />
                                    <div className="absolute right-3 top-[38px] cursor-pointer text-gray-600 hover:text-[#6667DD]" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </div>
                                </div>
                                <div className='flex flex-col'>
                                    <label className="text-gray-700 p-medium mb-1">Register</label>
                                    <button type="submit" disabled={loading} className={`w-full bg-gradient-to-r from-[#6667DD] to-[#7C81F8] text-white py-[9px] rounded-lg transition duration-300 p-regular cursor-pointer text-sm sm:text-base ${loading ? "opacity-70 hover:cursor-not-allowed" : "hover:scale-98"}`}>
                                        {loading ? "Creating Account..." : "Create Account"}
                                    </button>
                                </div>

                                {/* Row 3 - Full Width Button */}
                                {/* <div className="w-full md:col-span-2">
                                <button type="submit" disabled={loading} className={`w-full bg-gradient-to-r from-[#6667DD] to-[#7C81F8] text-white py-2.5 sm:py-3 rounded-lg transition duration-300 mt-2 p-regular cursor-pointer text-sm sm:text-base ${loading ? "opacity-70 hover:cursor-not-allowed" : "hover:scale-97"}`}>
                                    {loading ? "Creating Account..." : "Create Account"}
                                </button>
                            </div> */}

                                {/* Row 4 - Full Width Link */}
                                <div className="md:col-span-2 text-center mt-3">
                                    <p className="text-gray-600 p-regular text-sm sm:text-base">
                                        Already have an account?{' '}
                                        <Link to="/login" className="text-[#6667DD] p-medium hover:underline">
                                            Login Now
                                        </Link>
                                    </p>
                                </div>
                            </Form>
                        )
                    }}
                </Formik>
            </div>
            {/* Animation Styles */}
            <style>{`
                @keyframes bounce-slow { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-20px);} }
                @keyframes bounce-medium { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-30px);} }
                @keyframes bounce-fast { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-40px);} }
                @keyframes bounce-slower { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-15px);} }
                .animate-bounce-slow { animation: bounce-slow 6s infinite ease-in-out; }
                .animate-bounce-medium { animation: bounce-medium 5s infinite ease-in-out; }
                .animate-bounce-fast { animation: bounce-fast 4s infinite ease-in-out; }
                .animate-bounce-slower { animation: bounce-slower 7s infinite ease-in-out; }
            `}</style>
        </div>
    );
};

export default Register;
