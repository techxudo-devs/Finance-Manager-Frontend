import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

const DownloadTransactionsPDF = (transactions, category, dateFilter, customRange) => {
    if (!transactions || transactions.length === 0) {
        toast.error("No transactions to download!");
        return;
    } else {
        toast.success("Transactions downloaded successfully.")
    }

    const doc = new jsPDF();

    // Modern color palette
    const colors = {
        primary: [99, 102, 241],      // Indigo
        secondary: [139, 92, 246],     // Purple
        text: [30, 41, 59],            // Slate-800
        textLight: [100, 116, 139],    // Slate-500
        border: [226, 232, 240],       // Slate-200
        background: [248, 250, 252],   // Slate-50
        success: [34, 197, 94],        // Green
        danger: [239, 68, 68]          // Red
    };

    // Add subtle background
    doc.setFillColor(...colors.background);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 60, 'F');

    // Modern header with gradient effect simulation
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 3, 'F');

    // Title with modern typography
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(...colors.text);
    doc.text("Transaction Report", 14, 25);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text("POWERED BY TECHXUDO", 14, 32);

    // Subtitle line
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.line(14, 36, 80, 36);

    // Date metadata
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.textLight);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}`, 14, 45);

    // Filter badges with modern card-like design
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    // Category badge
    doc.setFillColor(...colors.primary);
    doc.roundedRect(14, 51, 45, 7, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("CATEGORY", 16, 55.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.text);
    doc.text(category, 62, 55.5);

    // Date filter badge
    let dateText = dateFilter;
    if (dateFilter === "Custom" && customRange.from && customRange.to) {
        dateText = `${customRange.from} to ${customRange.to}`;
    }
    doc.setFillColor(...colors.secondary);
    doc.roundedRect(14, 60, 35, 7, 2, 2, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("PERIOD", 16, 64.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.text);
    doc.text(dateText, 52, 64.5);

    // Calculate summary stats
    const totalIncome = transactions
        .filter(t => t.type.toLowerCase() === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpense = transactions
        .filter(t => t.type.toLowerCase() === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Summary cards
    const cardY = 73;
    const cardWidth = 60;
    const cardHeight = 18;

    // Total Transactions card
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, cardY, cardWidth, cardHeight, 3, 3, 'FD');
    doc.setDrawColor(...colors.border);
    doc.setFontSize(8);
    doc.setTextColor(...colors.textLight);
    doc.text("TOTAL TRANSACTIONS", 17, cardY + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.text);
    doc.text(transactions.length.toString(), 17, cardY + 14);

    // Income card
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(77, cardY, cardWidth, cardHeight, 3, 3, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(...colors.textLight);
    doc.text("TOTAL INCOME", 80, cardY + 6);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.success);
    const currency = transactions[0]?.currency || '$';
    doc.text(`${currency} ${totalIncome.toFixed(2)}`, 80, cardY + 14);

    // Expense card
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(140, cardY, cardWidth, cardHeight, 3, 3, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(...colors.textLight);
    doc.text("TOTAL EXPENSES", 143, cardY + 6);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.danger);
    doc.text(`${currency} ${totalExpense.toFixed(2)}`, 143, cardY + 14);

    // Prepare table data with better formatting
    const tableData = transactions.map((txn, index) => [
        index + 1,
        txn.title,
        txn.category,
        txn.type,
        `${txn.currency} ${parseFloat(txn.amount).toFixed(2)}`,
        new Date(txn.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }),
        txn.description || "-",
    ]);

    // Modern table with enhanced styling
    autoTable(doc, {
        startY: 97,
        head: [["#", "Title", "Category", "Type", "Amount", "Date", "Description"]],
        body: tableData,
        theme: 'plain',
        styles: {
            fontSize: 9,
            cellPadding: 4,
            lineColor: colors.border,
            lineWidth: 0.1,
            textColor: colors.text,
            font: "helvetica"
        },
        headStyles: {
            fillColor: colors.primary,
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 5
        },
        alternateRowStyles: {
            fillColor: colors.background
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center', textColor: colors.textLight },
            1: { cellWidth: 35 },
            2: { cellWidth: 25 },
            3: { cellWidth: 22, fontStyle: 'bold' },
            4: { cellWidth: 30, fontStyle: 'bold', halign: 'right' },
            5: { cellWidth: 28 },
            6: { cellWidth: 50 }
        },
        didDrawCell: (data) => {
            // Color-code transaction types in the Type column
            if (data.column.index === 3 && data.cell.section === 'body') {
                const type = data.cell.raw;
                const cellText = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

                // Clear the default text first
                if (data.row.index % 2 === 0) {
                    doc.setFillColor(255, 255, 255);
                } else {
                    doc.setFillColor(...colors.background);
                }
                doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');

                // Draw colored text
                if (type.toLowerCase() === 'income') {
                    doc.setTextColor(...colors.success);
                } else if (type.toLowerCase() === 'expense') {
                    doc.setTextColor(...colors.danger);
                }
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.text(cellText, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 3);
            }
        }
    });

    // Modern footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer line
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.5);
        doc.line(14, doc.internal.pageSize.getHeight() - 20,
            doc.internal.pageSize.getWidth() - 14,
            doc.internal.pageSize.getHeight() - 20);

        // Page number
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...colors.textLight);
        doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 12,
            { align: 'center' }
        );
    }

    doc.save(`Transactions_${new Date().toISOString().split('T')[0]}.pdf`);
};

export default DownloadTransactionsPDF;
