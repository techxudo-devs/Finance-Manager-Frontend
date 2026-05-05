import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, removeConnection, resendInvite, fetchPendingInvites, deleteInvite } from "../hooks/getUsers";
import { fetchShares } from "../hooks/recipientsShare";
import ManageUserSharesModal from "../mods/ManageUserSharesModal";
import { Files, FilePlus, UserRoundMinusIcon, RefreshCw, UserRoundPlus, X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AddUsers from "./AddUsers";
import ConnectionRequests from "./ConnectionRequests";
import { useConnectionRequests } from "../hooks/connections";
import { resendConnectionEmail } from "../hooks/connections";

const UsersInRecipients = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem("user"));

    // State for modals
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    // State to hold the user being acted upon
    const [selectedUser, setSelectedUser] = useState(null);

    // For Filtering Cards
    const [searchTerm, setSearchTerm] = useState("");

    // Filter for pending, accepted, all users card
    const [selectedFilter, setSelectedFilter] = useState("All");

    const { sentRequests, isLoading: isLoadingSentRequests } = useConnectionRequests();

    // Fetch all users (invited by me + invited me)
    const { data: usersData, isPending: isLoadingUsers } = useQuery({
        queryKey: ["users"],
        queryFn: fetchUsers,
        placeholderData: (previousData) => previousData,
    });

    const { data: pendingInvites = [], isLoading: isLoadingInvites } = useQuery({
        queryKey: ['pendingInvites'],
        queryFn: fetchPendingInvites,
        placeholderData: (previousData) => previousData,
    });

    // Fetch ALL shared cards involving the current user
    const { data: allShares = [], isPending: isLoadingShares } = useQuery({
        queryKey: ["shares"],
        queryFn: fetchShares,
    });

    // Mutation for removing connection for a user
    const { mutate: removeConnectionMutate, isPending: isRemovingConnection } = useMutation({
        mutationFn: removeConnection,
        onSuccess: (data) => {
            toast.success(data.message || "Connection removed successfully");
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["shares"] });
            setIsDeleteUserModalOpen(false);
            setSelectedUser(null);
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to remove connection"),
    });

    const { mutate: resendInviteMutate, isPending: isResendingInvite, variables: resendingInviteTarget } = useMutation({
        mutationFn: resendInvite,
        onSuccess: (data) => {
            const whatsappLinks = data.results
                ?.filter((result) => result.whatsappUrl)
                .map((result) => result.whatsappUrl) || [];

            whatsappLinks.forEach((url) => {
                const popup = window.open(url, "_blank", "noopener,noreferrer");
                if (!popup) {
                    toast.error("Allow pop-ups to open the WhatsApp invitation.");
                }
            });

            toast.success("Invite resent successfully!");
        },
        onError: (err) => toast.error("Failed to resend invite."),
    });

    const { mutate: resendConnectionMutate, isPending: isResendingConnection, variables: resendingUserEmail } = useMutation({
        mutationFn: resendConnectionEmail,
        onSuccess: (data) => toast.success(data.message || "Connection request resent!"),
        onError: (err) => toast.error(err.response?.data?.message || "Failed to resend request."),
    });

    const { mutate: deleteInviteMutate, isPending: isDeletingInvite, variables: deletingInviteId } = useMutation({
        mutationFn: deleteInvite,
        onSuccess: (data) => {
            toast.success(data.message || "Invite cancelled successfully.");
            queryClient.invalidateQueries({ queryKey: ["pendingInvites"] });
            setIsDeleteUserModalOpen(false);
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to cancel invite."),
    });

    // Combine invited users and the user who invited me into one list
    const allUsersWithStatus = useMemo(() => {
        if (!usersData && !sentRequests && !pendingInvites) return [];

        const userMap = new Map();

        // Connected users
        const invited = usersData?.invitedUsers || [];
        const inviter = usersData?.invitedBy ? [usersData.invitedBy] : [];
        [...invited, ...inviter].forEach(user => {
            if (user) userMap.set(user._id, { ...user, connectionStatus: 'Connected' });
        });

        // Pending Connection Requests (for existing users)
        sentRequests.forEach(req => {
            if (req.recipient && !userMap.has(req.recipient._id)) {
                userMap.set(req.recipient._id, { ...req.recipient, connectionStatus: 'Pending' });
            }
        });

        // Pending Invites (for new, unregistered users)
        pendingInvites.forEach(invite => {
            if (!userMap.has(invite.email)) {
                userMap.set(invite.email, invite);
            }
        });

        return Array.from(userMap.values());
    }, [usersData, sentRequests, pendingInvites]);

    const filteredUsers = useMemo(() => {
        let filtered = allUsersWithStatus;

        // Apply Search Filter
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (user) =>
                    user.name?.toLowerCase().includes(lower) ||
                    user.email?.toLowerCase().includes(lower)
            );
        }

        // Apply Status Filter
        if (selectedFilter === "Accepted") {
            filtered = filtered.filter((user) => user.connectionStatus === "Connected");
        } else if (selectedFilter === "Pending") {
            filtered = filtered.filter((user) =>
                user.connectionStatus?.startsWith("Pending")
            );
        }

        return filtered;
    }, [allUsersWithStatus, searchTerm, selectedFilter]);

    const handleManageClick = (user) => {
        if (user.connectionStatus?.startsWith('Pending')) {
            toast.info("You can manage payments once the user accepts your request.");
            return;
        }
        setSelectedUser(user);
        setIsManageModalOpen(true);
    };

    const handleRemoveConnectionClick = (user) => {
        setSelectedUser(user);
        setIsDeleteUserModalOpen(true);
    };

    if (isLoadingUsers || isLoadingShares || isLoadingSentRequests || isLoadingInvites) {
        return (
            <div className="w-full px-4 sm:px-6 md:px-8 py-6 bg-[#F6F9FC] space-y-6 animate-pulse">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center gap-4">
                    <div className="h-6 w-48 bg-gray-300 rounded"></div>
                    <div className="h-10 w-32 bg-gray-300 rounded-full md:block hidden"></div>
                </div>

                {/* Shared By Me Title Skeleton */}
                <div className="h-5 w-32 bg-gray-300 rounded mt-4"></div>

                {/* Shared By Me Cards Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                    {Array.from({ length: 2 }).map((_, idx) => (
                        <div key={idx} className="p-4 border border-gray-200 rounded-lg bg-gray-200 h-32"></div>
                    ))}
                </div>

                {/* Shared With Me Title Skeleton */}
                <div className="h-5 w-32 bg-gray-300 rounded mt-6"></div>

                {/* Shared With Me Cards Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                    {Array.from({ length: 2 }).map((_, idx) => (
                        <div key={idx} className="p-4 border border-gray-200 rounded-lg bg-gray-200 h-32"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full px-4 sm:px-6 md:px-8 py-6 bg-[#F6F9FC]">
            <div className="flex lg:flex-row flex-col gap-4 items-start lg:items-center justify-between border-b border-blue-100 pb-6">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg sm:text-2xl p-bold text-[#6667DD]">Invite Recipients</h2>
                    <p className="p-regular text-sm sm:text-base text-gray-700">Add recipients to manage shared transactions efficiently and securely.</p>
                </div>
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-gradient-to-r from-[#6667DD] to-[#7C81F8] text-white px-5 py-2.5 sm:py-3 rounded-full shadow-md hover:scale-97 transition-all duration-300 cursor-pointer flex items-center gap-2 sm:text-base text-sm"><UserRoundPlus size={20} />Invite Recipients</button>
            </div>

            <div className="my-6">
                <ConnectionRequests />
            </div>

            {filteredUsers.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between my-6">
                    <h2 className="text-lg sm:text-2xl p-bold text-[#6667DD]">Share Payments With Your Connections</h2>
                    <div className="flex flex-col items-end">
                        <div>
                            <input
                                type="text"
                                placeholder="Search recipients by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-96 border border-gray-300 rounded-lg px-4 py-2 text-gray-700 shadow-sm outline-none text-sm"
                            />
                        </div>
                        <div className="flex gap-3 mt-4">
                            {["All", "Accepted", "Pending"].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setSelectedFilter(filter)}
                                    className={`px-4 py-1.5 rounded-full text-xs cursor-pointer p-medium transition-all duration-300 ${selectedFilter === filter
                                        ? "bg-[#6667DD] text-white shadow-md scale-105"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                        }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                        const isCurrentlyResendingInvite = isResendingInvite
                            && resendingInviteTarget?.contact === (user.contact || user.email);
                        const isCurrentlyResendingConnection = isResendingConnection && resendingUserEmail === user.email;
                        const isThisCardResending = isCurrentlyResendingInvite || isCurrentlyResendingConnection;

                        const isCurrentlyDeletingInvite = isDeletingInvite && deletingInviteId === user._id;
                        const isThisCardDeleting = isRemovingConnection || isCurrentlyDeletingInvite;

                        const sharesWithThisUser = allShares.filter(share =>
                            (share.sharedBy._id === currentUser._id && share.sharedWith.some(u => u._id === user._id)) ||
                            (share.sharedBy._id === user._id && share.sharedWith.some(u => u._id === currentUser._id))
                        );
                        const hasShares = sharesWithThisUser.length > 0;

                        return (
                            <div
                                key={user._id}
                                className="bg-transparent backdrop-blur-sm border border-[#6667DD]/50 transition-all duration-300 rounded-2xl shadow-sm p-4 flex flex-col gap-4"
                            >
                                {/* Top Section: Profile + Icons */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    {/* Left: Image + Name + Email */}
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <img
                                            src={
                                                user.profileImage ||
                                                "https://images.unsplash.com/photo-1615109398623-88346a601842?ixlib=rb-4.1.0&auto=format&fit=crop&q=60&w=500"
                                            }
                                            alt={user.name}
                                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shadow-sm border border-gray-200"
                                        />
                                        <div>
                                            <h3 className="p-semibold text-base sm:text-lg text-gray-800 leading-tight">
                                                {user.name}
                                            </h3>
                                            <p className="p-regular text-sm text-gray-500 break-all">
                                                {user.email}
                                            </p>
                                            <div className={`flex items-center gap-1.5 mt-1 text-xs p-semibold ${user.connectionStatus === "Connected" ? "text-green-600" : "text-orange-500"
                                                }`}>
                                                {user.connectionStatus === "Pending" && <Clock size={12} />}
                                                <span>Status: {user.connectionStatus}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {user.connectionStatus?.startsWith('Pending') && (
                                            <button
                                                onClick={() => {
                                                    if (user.connectionStatus === 'Pending (Unregistered)') {
                                                        resendInviteMutate({
                                                            channel: user.channel || "email",
                                                            email: user.channel === "email" ? user.email : undefined,
                                                            phone: user.channel === "whatsapp" ? user.phone : undefined,
                                                            contact: user.contact || user.email,
                                                        });
                                                    } else {
                                                        resendConnectionMutate(user.email);
                                                    }
                                                }}
                                                disabled={isThisCardResending}
                                                className="p-2.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all duration-300 cursor-pointer shadow-sm"
                                            >
                                                <RefreshCw size={16} className={isThisCardResending ? 'animate-spin' : ''} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleRemoveConnectionClick(user)}
                                            className="p-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-300 cursor-pointer shadow-sm"
                                        >
                                            <UserRoundMinusIcon size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Bottom: Manage Button */}
                                <button
                                    onClick={() => handleManageClick(user)}
                                    disabled={user.connectionStatus?.startsWith('Pending')}
                                    className={`flex items-center justify-center gap-2 text-sm p-regular px-3.5 py-2.5 rounded-lg transition-all duration-500 shadow-sm w-full sm:w-auto ${user.connectionStatus?.startsWith('Pending')
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        : hasShares
                                            ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 cursor-pointer"
                                            : "bg-gradient-to-r from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200 cursor-pointer"
                                        }`}
                                >
                                    {user.connectionStatus?.startsWith('Pending') ? (
                                        <>
                                            <Clock size={16} />
                                            Awaiting Acceptance
                                        </>
                                    ) : hasShares ? (
                                        <>
                                            <Files size={16} />
                                            View / Add Payments
                                        </>
                                    ) : (
                                        <>
                                            <FilePlus size={16} />
                                            Create Shared Card
                                        </>
                                    )}
                                </button>
                            </div>

                        );
                    })
                ) : (
                    <p className="text-center text-gray-500 p-4 bg-[#F3E8FF] mt-4">
                        {searchTerm
                            ? "No recipients found for your search."
                            : "You have no connected users to manage payments with."}
                    </p>
                )}
            </div>



            {selectedUser && (
                <ManageUserSharesModal
                    isOpen={isManageModalOpen}
                    onClose={() => setIsManageModalOpen(false)}
                    user={selectedUser}
                    shares={allShares.filter(share =>
                        (share.sharedBy._id === currentUser._id && share.sharedWith.some(u => u._id === selectedUser._id)) ||
                        (share.sharedBy._id === selectedUser._id && share.sharedWith.some(u => u._id === currentUser._id))
                    )}
                    allUsers={allUsersWithStatus}
                />
            )}

            <AnimatePresence>
                {isInviteModalOpen && (
                    <motion.div className="fixed inset-0 z-50 sm:px-0 px-4 flex items-center justify-center bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-blue-200/50 px-4 sm:px-8 pb-10 sm:pb-8 pt-4 sm:pt-6 rounded-2xl w-full max-w-xl">
                            <button onClick={() => setIsInviteModalOpen(false)} className="absolute top-2 sm:top-2 right-2 text-white bg-gray-800/50 cursor-pointer transition-all duration-300 rounded-full p-1 hover:bg-gray-800/80 z-10">
                                <X size={18} />
                            </button>
                            <AddUsers onInviteSuccess={() => setIsInviteModalOpen(false)} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isDeleteUserModalOpen && selectedUser && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 20 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center flex flex-col items-center"
                        >
                            <p className="bg-red-200 text-red-600 p-3 rounded-full mb-4">
                                <UserRoundMinusIcon size={20} />
                            </p>
                            <h2 className="text-lg p-semibold text-gray-800 mb-2">Confirm Removal</h2>
                            <p className="text-gray-600 mb-6 p-regular text-sm">
                                {selectedUser.connectionStatus === "Pending (Unregistered)" ? (
                                    <>
                                        Are you sure you want to cancel the invitation for{" "}
                                        <span className="text-[#6667DD] p-semibold">
                                            {selectedUser.email}
                                        </span>
                                        ?
                                    </>
                                ) : (
                                    <>
                                        Are you sure you want to remove your connection with{" "}
                                        <span className="text-[#6667DD] p-semibold">
                                            {selectedUser.name}
                                        </span>
                                        ?
                                    </>
                                )}
                            </p>
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => setIsDeleteUserModalOpen(false)}
                                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all duration-300 cursor-pointer border border-gray-200 hover:border-gray-300 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (selectedUser.connectionStatus === 'Pending (Unregistered)') {
                                            deleteInviteMutate(selectedUser._id);
                                        } else {
                                            removeConnectionMutate(selectedUser._id);
                                        }
                                    }}
                                    disabled={isRemovingConnection || isDeletingInvite}
                                    className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 transition-all duration-300 cursor-pointer text-sm border border-red-600 hover:border-red-700 text-white"
                                >
                                    {(isRemovingConnection || isDeletingInvite) ? "Removing..." : "Confirm"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UsersInRecipients;
