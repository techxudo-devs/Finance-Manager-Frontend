import { useState, useEffect } from "react";
import { Plus, SquarePen, Trash2, DownloadCloud } from "lucide-react";
import DataTable from "react-data-table-component";
import { toast } from "sonner";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  fetchTransactions,
  addTransactions,
  updateTransaction,
  deleteTransaction,
  deleteAllTransactions,
  transactionPictureUploadSignature
} from "../hooks/transactions";
import DownloadTransactionsPDF from "../utils/DownloadTransactionsPDF";
import {
  AddTransactionModal,
  ConfirmDeleteModal,
  ImagePreviewModal,
} from "../mods/TransactiosModals";
import TableSkeleton from "../mods/TableSkeleton";
import axios from "axios";

const handleApiError = (error, customMessage = "An unexpected error occurred.") => {
  if (error.response) {
    toast.error(error.response.data.message || customMessage);
  } else {
    toast.error("A network error occurred. Please check your connection.");
  }
};

const currencySymbols = { USD: "$", EUR: "€", PKR: "₨", INR: "₹" };
const categoryColors = {
  Food: "bg-red-200",
  Rent: "bg-yellow-200",
  Shopping: "bg-blue-200",
  Salary: "bg-green-200",
  Investment: "bg-purple-200",
  Other: "bg-gray-200",
};
const categoryButtonColors = {
  Food: "bg-red-500 text-white",
  Rent: "bg-yellow-500 text-white",
  Shopping: "bg-blue-500 text-white",
  Salary: "bg-green-500 text-white",
  Investment: "bg-purple-500 text-white",
  Other: "bg-gray-500 text-white",
};

const Transactions = () => {
  // Modal and Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    title: "", amount: "", category: "", currency: "USD", type: "income",
    date: new Date().toISOString().split("T")[0], description: "", image: null,
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Filter State
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dateFilter, setDateFilter] = useState("Entire");
  const [customDateRange, setCustomDateRange] = useState({ from: "", to: "" });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination & Sort State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortConfig, setSortConfig] = useState({ field: 'date', order: 'desc' });

  const [apiDateParams, setApiDateParams] = useState({ dateFrom: null, dateTo: null });

  useEffect(() => {
    const today = new Date();
    let start = null;
    let end = null;

    switch (dateFilter) {
      case "Today":
        start = new Date(today.setHours(0, 0, 0, 0));
        end = new Date(new Date().setHours(23, 59, 59, 999));
        break;
      case "Last Week":
        start = new Date(new Date().setDate(today.getDate() - 7));
        end = new Date();
        break;
      case "This Month":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "Last Month":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
        break;
      case "Last 3 Months":
        start = new Date(new Date().setMonth(today.getMonth() - 3));
        end = new Date();
        break;
      case "This Year":
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      // case "Custom":
      //   start = customDateRange.from ? new Date(customDateRange.from) : null;
      //   end = customDateRange.to ? new Date(new Date(customDateRange.to).setHours(23, 59, 59, 999)) : null;
      //   break;
      default: // 'Entire'
        start = null;
        end = null;
    }

    setApiDateParams({
      dateFrom: start ? start.toISOString() : null,
      dateTo: end ? end.toISOString() : null,
    });
  }, [dateFilter, customDateRange]);

  const queryClient = useQueryClient();

  const { data, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["transactions", page, limit, sortConfig, selectedCategory, apiDateParams],
    queryFn: () => fetchTransactions({
      page,
      limit,
      sort: sortConfig.field,
      order: sortConfig.order,
      category: selectedCategory,
      dateFrom: apiDateParams.dateFrom,
      dateTo: apiDateParams.dateTo,
    }),
    keepPreviousData: true,
    onError: (error) => handleApiError(error, "Failed to fetch transactions."),
  });

  const transactions = data?.transactions || [];

  // --- Mutations ---
  const { mutate: addTransactionMutate, isPending: isAdding } = useMutation({
    mutationFn: addTransactions,
    onSuccess: () => {
      toast.success("Transaction added successfully!");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setIsModalOpen(false);
      setFormData({
        title: "", amount: "", category: "", currency: "USD", type: "income",
        date: new Date().toISOString().split("T")[0], description: "", image: null,
      });
    },
    onError: (error) => handleApiError(error, "Failed to add transaction."),
    onSettled: () => setIsSubmitting(false),
  });

  const { mutate: updateTransactionMutate, isPending: isUpdating } = useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => {
      toast.success("Transaction updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setIsModalOpen(false);
      setEditingTransaction(null);
    },
    onError: (error) => handleApiError(error, "Failed to update transaction."),
    onSettled: () => setIsSubmitting(false),
  });

  const { mutate: deleteTransactionMutate } = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      toast.success("Transaction deleted.");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error) => handleApiError(error, "Failed to delete transaction."),
  });

  const { mutate: deleteAllMutate } = useMutation({
    mutationFn: deleteAllTransactions,
    onSuccess: () => {
      toast.success("All transactions have been deleted.");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error) => handleApiError(error, "Failed to delete all transactions."),
  });

  // --- Handlers ---
  const handleChange = (e) => {
    if (e.target.name === "image") setFormData({ ...formData, image: e.target.files[0] });
    else setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenAddModal = () => {
    setEditingTransaction(null);
    setFormData({ title: "", amount: "", category: "", currency: "USD", type: "income", date: new Date().toISOString().split("T")[0], description: "", image: null });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      ...transaction,
      date: new Date(transaction.date).toISOString().split("T")[0],
      image: null,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.category) {
      return toast.error("Please fill in all required fields.");
    }

    setIsSubmitting(true);

    let finalImageUrl = editingTransaction ? editingTransaction.imageUrl : null;

    // Step 1: Check if a new image file was selected
    if (formData.image) {
      try {
        // Step 1a: Get permission (signature) from our backend
        toast.info("Uploading image...");
        const signatureData = await transactionPictureUploadSignature();

        // Step 1b: Prepare the form data for Cloudinary
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append("file", formData.image);
        cloudinaryFormData.append("api_key", signatureData.api_key);
        cloudinaryFormData.append("timestamp", signatureData.timestamp);
        cloudinaryFormData.append("signature", signatureData.signature);
        cloudinaryFormData.append("folder", "user_uploads");

        // Step 1c: Upload DIRECTLY to Cloudinary's API endpoint
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`;
        const cloudinaryRes = await axios.post(cloudinaryUrl, cloudinaryFormData);

        finalImageUrl = cloudinaryRes.data.secure_url; // This is the final URL of the uploaded image
        toast.success("Image uploaded successfully!");

      } catch (error) {
        console.error("Cloudinary upload failed:", error);
        handleApiError(error, "Failed to upload image. Please try again.");
        setIsSubmitting(false);
        return; // Stop if the image upload fails
      }
    }

    // Step 2: Prepare the final transaction data for OUR backend
    // We are NOT sending the file anymore, just the URL string.
    const finalTransactionData = {
      title: formData.title,
      amount: formData.amount,
      category: formData.category,
      currency: formData.currency,
      type: formData.type,
      date: formData.date,
      description: formData.description,
      imageUrl: finalImageUrl, // Use the URL from Cloudinary (or existing URL)
    };

    // Step 3: Submit the transaction data to our backend
    if (editingTransaction) {
      updateTransactionMutate({ id: editingTransaction._id, formData: finalTransactionData });
    } else {
      addTransactionMutate(finalTransactionData);
    }
  };

  const handleSort = (column, sortDirection) => {
    setSortConfig({ field: column.selector, order: sortDirection });
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newLimit, newPage) => {
    setLimit(newLimit);
    setPage(newPage);
  };

  const handleDownload = () => {
    setIsDownloading(true);
    setTimeout(() => {
      try {
        DownloadTransactionsPDF(transactions, selectedCategory, dateFilter, customDateRange);
      } catch {
        toast.error("Failed to download transactions!");
      } finally {
        setIsDownloading(false);
      }
    }, 0);
  };

  const handleSingleTransactionDownload = (transaction) => {
    try {
      DownloadTransactionsPDF(
        [transaction],
        transaction.category || "Other",
        "Single Transaction",
        { from: "", to: "" }
      );
    } catch {
      toast.error("Failed to download transaction!");
    }
  };

  const columns = [
    { name: "Title", selector: "title", sortable: true, cell: row => <span>{row.title}</span>, width: "200px" },
    { name: "Category", selector: "category", sortable: true, cell: row => <span className={`p-regular px-2 py-1 rounded ${categoryColors[row.category] || "bg-gray-200"}`}>{row.category || "Other"}</span>, width: "130px" },
    { name: "Type", selector: "type", sortable: true, cell: row => <span className={`p-regular ${row.type === "income" ? "text-green-500" : "text-red-500"}`}>{row.type.charAt(0).toUpperCase() + row.type.slice(1)}</span> },
    { name: "Amount", selector: "amount", sortable: true, cell: row => <span className={`p-regular ${row.type === "income" ? "text-green-500" : "text-red-500"}`}>{row.type === "income" ? "+" : "-"} {currencySymbols[row.currency]} {row.amount} ({row.currency})</span>, width: "180px" },
    { name: "Date", selector: "date", sortable: true, cell: row => <span className="p-regular text-gray-700">{new Date(row.date).toLocaleDateString()}</span>, width: "110px" },
    { name: "Description", selector: "description", sortable: true, cell: row => <span className="p-regular text-gray-700 line-clamp-2">{row.description || "-"}</span>, width: "200px" },
    { name: "Image", selector: "imageUrl", cell: row => row.imageUrl ? <img loading="lazy" src={row.imageUrl} alt="txn" onClick={() => setSelectedImage(row.imageUrl)} className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover cursor-pointer" /> : <span className="p-regular text-gray-500">No Image</span> },
    { name: "Action", cell: row => (<div className="flex items-center justify-center gap-2 w-[100px] sm:w-[120px]"><button onClick={() => { setTransactionToDelete(row._id); setIsDeleteModalOpen(true); }} className="bg-red-100 hover:bg-red-200 p-2 cursor-pointer rounded-full transition-all duration-300"><Trash2 size={16} className="sm:size-[18px] text-red-500" /></button><button onClick={() => handleOpenEditModal(row)} className="bg-blue-100 hover:bg-blue-200 p-2 cursor-pointer rounded-full transition-all duration-300"><SquarePen size={16} className="sm:size-[18px] text-blue-500" /></button></div>) },
    {
      name: "Download Transaction",
      cell: row => (
        <button
          onClick={() => handleSingleTransactionDownload(row)}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#E0E2FD] px-3 py-2 text-xs text-[#4447AA] transition-all duration-300 hover:bg-[#C8CBFC] cursor-pointer p-medium"
        >
          <DownloadCloud size={14} />
          Download Transaction
        </button>
      ),
      width: "230px"
    },
  ];

  const customStyles = { headCells: { style: { fontSize: "14px", fontWeight: "500", fontFamily: "Poppins", color: "#5759C7", textTransform: "uppercase" } } };
  const categories = ["All", "Food", "Rent", "Shopping", "Salary", "Investment", "Other"];
  const dateFilters = ["Entire", "Today", "Last Week", "This Month", "Last Month", "Last 3 Months", "This Year"];

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="bg-[#F7F9FC] p-3 sm:p-6 relative max-w-7xl mx-auto min-h-[80vh] w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl p-semibold text-[#6667DD]">My Transactions</h2>
        <button onClick={handleOpenAddModal} className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#6667DD] to-[#7C81F8] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-md cursor-pointer hover:scale-[0.98] transition-all duration-300">
          <Plus size={16} className="sm:size-[18px]" /> Add Transaction
        </button>
      </div>

      {/* Stats + Dropdowns + Download */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Income & Expense */}
        <div className="flex gap-3">
          <div className="bg-[#D4F5E9] text-gray-700 px-4 py-2 rounded-lg text-sm p-medium">💰 Income: {currencySymbols["USD"]} {totalIncome}</div>
          <div className="bg-[#FFDADA] text-gray-700 px-4 py-2 rounded-lg text-sm p-medium">💸 Expense: {currencySymbols["USD"]} {totalExpense}</div>
        </div>

        {/* Right: Category, Date, Download */}
        <div className="flex gap-2 items-center">
          {/* Category Select */}
          <div className="flex flex-col text-sm -translate-y-2">
            <span className="text-gray-600 p-regular mb-1 text-xs">Category</span>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="rounded-lg border border-[#6667DD] bg-blue-50 px-3 py-[6px] text-sm outline-none cursor-pointer p-regular">
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Date/Time Select */}
          <div className="flex flex-col text-sm -translate-y-2">
            <span className="text-gray-600 p-regular mb-1 text-xs">Time</span>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="rounded-lg border border-[#6667DD] bg-blue-50 px-3 py-[6px] text-sm outline-none cursor-pointer p-regular">
              {dateFilters.map(df => <option key={df} value={df}>{df}</option>)}
            </select>
          </div>

          <button onClick={handleDownload} disabled={isDownloading || transactions.length === 0} className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2 cursor-pointer rounded-lg text-sm p-medium transition-all duration-300 ${isDownloading || transactions.length === 0 ? "bg-gray-300 text-gray-700 hover:cursor-not-allowed" : "bg-[#E0E2FD] hover:bg-[#C8CBFC] text-[#4447AA]"}`}>
            <DownloadCloud size={16} className="sm:size-[18px]" />
            {isDownloading ? "Downloading..." : transactions.length === 0 ? "No Transactions" : "Download PDF"}
          </button>
        </div>
      </div>
      {/* <div className="flex flex-col items-end">
        {dateFilter === "Custom" && (
          <div className="flex gap-2 mb-2">
            <input type="date" value={customDateRange.from} onChange={(e) => setCustomDateRange({ ...customDateRange, from: e.target.value })} className="rounded-lg border border-[#6667DD] px-2 py-1 text-sm outline-none" />
            <input type="date" value={customDateRange.to} onChange={(e) => setCustomDateRange({ ...customDateRange, to: e.target.value })} className="rounded-lg border border-[#6667DD] px-2 py-1 text-sm outline-none" />
          </div>
        )}
      </div> */}

      {/* Data Table */}
      <div className="flex-1 overflow-x-auto pt-4">
        {isLoadingTransactions && !data ? (
          <TableSkeleton />
        ) : (
          <div className="max-w-full mx-auto">
            <DataTable
              columns={columns}
              data={transactions}
              progressPending={isLoadingTransactions}
              pagination
              paginationServer
              sortServer
              paginationTotalRows={data?.totalTransactions}
              paginationPerPage={limit}
              onSort={handleSort}
              onChangePage={handlePageChange}
              onChangeRowsPerPage={handlePerRowsChange}
              highlightOnHover
              striped
              fixedHeader
              customStyles={customStyles}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <AddTransactionModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} handleSubmit={handleSubmit} handleChange={handleChange} formData={formData} isAdding={isSubmitting} isEditing={!!editingTransaction} />

      <ConfirmDeleteModal isOpen={isDeleteModalOpen} setIsOpen={setIsDeleteModalOpen} onConfirm={() => { deleteTransactionMutate(transactionToDelete); setIsDeleteModalOpen(false); }} title="Are you sure?" description="Do you really want to delete this transaction? This action cannot be undone." />

      <ConfirmDeleteModal isOpen={isDeleteAllModalOpen} setIsOpen={setIsDeleteAllModalOpen} onConfirm={() => { deleteAllMutate(); setIsDeleteAllModalOpen(false); }} title="Are you sure?" description="Do you really want to delete all transactions? This action cannot be undone." />

      <ImagePreviewModal image={selectedImage} onClose={() => setSelectedImage(null)} />
    </div >
  );
};

export default Transactions;
