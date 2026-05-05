import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// Function to get the auth token
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) return {};
    return {
        Authorization: `Bearer ${token}`,
    };
};

// Fucntion for fetching users
export const fetchUsers = async ({ pageParam = 1 }) => {
    const res = await axios.get(`${API_URL}/api/users`, {
        headers: getAuthHeaders()
    });
    return res.data.users;
}

export const fetchPendingInvites = async ({ pageParam = 1 }) => {
    const res = await axios.get(`${API_URL}/api/invites/pending`, {
        headers: getAuthHeaders()
    });
    return res.data.invites;
};

export const deleteInvite = async (inviteId) => {
    const res = await axios.delete(`${API_URL}/api/invites/pending/${inviteId}`, {
        headers: getAuthHeaders(),
    });
    return res.data;
};

// Function to delete a user
export const deleteUsers = async (userId) => {
    const res = await axios.delete(`${API_URL}/api/delete-user/${userId}`, {
        headers: getAuthHeaders(),
    });
    return res.data;
}

export const removeConnection = async (userId) => {
    const res = await axios.delete(`${API_URL}/api/connections/${userId}`, {
        headers: getAuthHeaders(),
    });
    return res.data;
};

export const resendInvite = async ({ channel, email, phone, contact }) => {
    const payload = channel === "whatsapp"
        ? { channel: "whatsapp", phoneNumbers: [phone || contact] }
        : { channel: "email", emails: [email || contact] };

    const res = await axios.post(`${API_URL}/api/invite`, payload, {
        headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
        },
    });
    return res.data;
};
