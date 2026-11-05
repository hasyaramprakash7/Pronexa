import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import api from '../api/axios.jsx';
import { FaMapMarkerAlt, FaSpinner } from "react-icons/fa";

export default function Register() {
    const navigate = useNavigate();
    const [role, setRole] = useState('user');
    const [loadingAddr, setLoadingAddr] = useState(false);

    const [formData, setFormData] = useState({
        phone: '',
        password: '',
        barId: '',
        specialization: '',
        experienceYears: '',
        address: {
            latitude: null, longitude: null, pincode: '',
            state: '', district: '', country: 'India'
        }
    });

    // 1. Auto-detect Location on Mount
    useEffect(() => {
        if (navigator.geolocation) {
            setLoadingAddr(true);
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                updateAddressField('latitude', latitude);
                updateAddressField('longitude', longitude);

                try {
                    const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
                    const addr = res.data.address;
                    setFormData(prev => ({
                        ...prev,
                        address: {
                            ...prev.address,
                            pincode: addr.postcode || '',
                            state: addr.state || '',
                            district: addr.city || addr.district || addr.county || '',
                        }
                    }));
                } catch (err) { console.error("Geocode error", err); }
                setLoadingAddr(false);
            }, () => setLoadingAddr(false));
        }
    }, []);

    // 2. Fetch Address via Pincode
    const handlePincodeBlur = async () => {
        if (formData.address.pincode.length === 6) {
            setLoadingAddr(true);
            try {
                const res = await axios.get(`https://nominatim.openstreetmap.org/search?postalcode=${formData.address.pincode}&country=india&format=json&addressdetails=1`);
                if (res.data.length > 0) {
                    const addr = res.data[0].address;
                    setFormData(prev => ({
                        ...prev,
                        address: {
                            ...prev.address,
                            state: addr.state || '',
                            district: addr.city || addr.state_district || '',
                            latitude: res.data[0].lat,
                            longitude: res.data[0].lon
                        }
                    }));
                }
            } catch (err) { console.error("Pincode error", err); }
            setLoadingAddr(false);
        }
    };

    const updateAddressField = (field, value) => {
        setFormData(prev => ({
            ...prev,
            address: { ...prev.address, [field]: value }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Structure payload to match Backend
            const payload = {
                phone: formData.phone,
                password: formData.password,
                role: role,
                address: formData.address,
                ...(role === 'lawyer' && {
                    barId: formData.barId,
                    specialization: formData.specialization,
                    experienceYears: Number(formData.experienceYears)
                })
            };
            await api.post('/auth/register', payload);
            alert('Registration Successful!');
            navigate('/login');
        } catch (err) {
            alert(err.response?.data?.message || 'Signup Failed');
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-serif">
            <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                <h2 className="text-3xl font-bold text-white text-center mb-6">Create Account</h2>

                {/* Role Switcher */}
                <div className="flex bg-zinc-800 p-1 rounded-xl mb-6">
                    {['user', 'lawyer'].map(r => (
                        <button key={r} onClick={() => setRole(r)} className={`flex-1 py-2 rounded-lg transition ${role === r ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}>
                            {r.toUpperCase()}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Basic Info */}
                    <input type="text" placeholder="Phone Number" required className="bg-zinc-800 text-white p-3 rounded-lg outline-none border border-zinc-700 focus:border-blue-500"
                        onChange={e => setFormData({ ...formData, phone: e.target.value })} />

                    <input type="password" placeholder="Password" required className="bg-zinc-800 text-white p-3 rounded-lg outline-none border border-zinc-700 focus:border-blue-500"
                        onChange={e => setFormData({ ...formData, password: e.target.value })} />

                    {/* Address Section */}
                    <div className="md:col-span-2 border-t border-zinc-800 pt-4 mt-2">
                        <div className="flex items-center text-blue-500 mb-3">
                            <FaMapMarkerAlt className="mr-2" />
                            <span className="font-semibold text-lg">Address Details</span>
                            {loadingAddr && <FaSpinner className="animate-spin ml-3" />}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="Pincode" value={formData.address.pincode} onBlur={handlePincodeBlur}
                                onChange={e => updateAddressField('pincode', e.target.value)} className="bg-zinc-800 text-white p-3 rounded-lg outline-none" />

                            <input type="text" placeholder="District" value={formData.address.district} readOnly className="bg-zinc-800 text-zinc-400 p-3 rounded-lg outline-none cursor-not-allowed" />

                            <input type="text" placeholder="State" value={formData.address.state} readOnly className="bg-zinc-800 text-zinc-400 p-3 rounded-lg outline-none cursor-not-allowed" />

                            <input type="text" placeholder="Country" value={formData.address.country} readOnly className="bg-zinc-800 text-zinc-400 p-3 rounded-lg outline-none cursor-not-allowed" />
                        </div>
                    </div>

                    {/* Lawyer Only Fields */}
                    {role === 'lawyer' && (
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-800 pt-4 mt-2 animate-in fade-in">
                            <input type="text" placeholder="Bar Association ID" required className="bg-zinc-800 text-white p-3 rounded-lg outline-none"
                                onChange={e => setFormData({ ...formData, barId: e.target.value })} />
                            <input type="text" placeholder="Specialization" required className="bg-zinc-800 text-white p-3 rounded-lg outline-none"
                                onChange={e => setFormData({ ...formData, specialization: e.target.value })} />
                            <input type="number" placeholder="Exp (Years)" required className="bg-zinc-800 text-white p-3 rounded-lg outline-none"
                                onChange={e => setFormData({ ...formData, experienceYears: e.target.value })} />
                        </div>
                    )}

                    <button type="submit" className="md:col-span-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-4 transition-all active:scale-95">
                        Register Now
                    </button>
                </form>
                <p className="text-center text-zinc-500 mt-6">
                    Already have an account? <Link to="/login" className="text-blue-500 hover:underline">Login</Link>
                </p>
            </div>
        </div>
    );
}