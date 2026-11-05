import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setAuth, setLoading } from '../redux/authSlice.jsx';
import api from '../api/axios.jsx';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const [loginType, setLoginType] = useState('password');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        dispatch(setLoading(true));
        try {
            const { data } = await api.post('/auth/login', { phone, password });
            dispatch(setAuth(data.user));
            navigate('/dashboard');
        } catch (err) {
            alert(err.response?.data?.message || 'Login Failed');
            dispatch(setLoading(false));
        }
    };

    const handleSendOtp = async () => {
        try {
            await api.post('/auth/send-otp', { phone });
            setOtpSent(true);
            alert('OTP simulation: Check your terminal console!');
        } catch (err) { alert(err.response?.data?.message); }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/auth/verify-otp', { phone, otp });
            dispatch(setAuth(data.user));
            navigate('/dashboard');
        } catch (err) { alert(err.response?.data?.message); }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
                <h2 className="text-3xl font-bold text-white text-center mb-8">Login</h2>
                <div className="flex bg-zinc-800 p-1 rounded-2xl mb-8">
                    <button onClick={() => setLoginType('password')} className={`flex-1 py-3 rounded-xl transition ${loginType === 'password' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}>Password</button>
                    <button onClick={() => setLoginType('otp')} className={`flex-1 py-3 rounded-xl transition ${loginType === 'otp' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}>OTP Login</button>
                </div>
                {loginType === 'password' ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="text" placeholder="Phone" required className="w-full bg-zinc-800 text-white p-4 rounded-xl outline-none" onChange={e => setPhone(e.target.value)} />
                        <input type="password" placeholder="Password" required className="w-full bg-zinc-800 text-white p-4 rounded-xl outline-none" onChange={e => setPassword(e.target.value)} />
                        <button className="w-full bg-blue-600 py-4 rounded-xl font-bold text-white shadow-lg">Sign In</button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <input type="text" placeholder="Phone Number" required className="w-full bg-zinc-800 text-white p-4 rounded-xl outline-none" onChange={e => setPhone(e.target.value)} />
                        {otpSent && <input type="text" placeholder="6-Digit Code" required className="w-full bg-zinc-800 text-white p-4 rounded-xl outline-none" onChange={e => setOtp(e.target.value)} />}
                        {!otpSent ? <button type="button" onClick={handleSendOtp} className="w-full bg-zinc-700 py-4 rounded-xl font-bold text-white">Send OTP</button> : <button className="w-full bg-blue-600 py-4 rounded-xl font-bold text-white">Verify Code</button>}
                    </form>
                )}
                <p className="mt-8 text-center text-zinc-500">Need an account? <Link to="/register" className="text-blue-500 font-semibold hover:underline ml-1">Register</Link></p>
            </div>
        </div>
    );
}