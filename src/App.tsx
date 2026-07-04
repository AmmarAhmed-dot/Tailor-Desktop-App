import { useState, useEffect, type FormEvent, useRef } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import { urduPhoneticMap } from "./urduMapping";

interface Transaction {
  id: string;
  type: "jama" | "baqaya";
  amount: number;
  note: string;
  date: string; // ISO string
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  registerNumber: string;
  serialNumber: string;
  transactions: Transaction[];
  // Legacy fields kept for type compat during migration
  jama?: string;
  baqaya?: string;
}

const emptyCustomer: Customer = {
  id: "",
  name: "",
  phone: "",
  address: "",
  registerNumber: "",
  serialNumber: "",
  transactions: [],
};

// ── Ledger Helpers ──────────────────────────────────
const getTotalJama = (c: Customer): number =>
  c.transactions
    .filter((t) => t.type === "jama")
    .reduce((sum, t) => sum + t.amount, 0);

const getTotalBaqaya = (c: Customer): number =>
  c.transactions
    .filter((t) => t.type === "baqaya")
    .reduce((sum, t) => sum + t.amount, 0);

const getNetBalance = (c: Customer): number =>
  getTotalJama(c) - getTotalBaqaya(c);

const formatDate = (iso: string, isUrdu: boolean): string => {
  const d = new Date(iso);
  const date = d.toLocaleDateString(isUrdu ? "ur-PK" : "en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(isUrdu ? "ur-PK" : "en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}  ${time}`;
};

const formatCurrency = (n: number): string => n.toLocaleString("en-PK");

// ── Migrate old data ────────────────────────────────
const migrateCustomer = (c: any): Customer => {
  if (c.transactions && Array.isArray(c.transactions)) return c as Customer;
  const transactions: Transaction[] = [];
  const oldJama = parseFloat(c.jama);
  if (!isNaN(oldJama) && oldJama > 0) {
    transactions.push({
      id: `mig-j-${Date.now()}`,
      type: "jama",
      amount: oldJama,
      note: "Migrated from old data",
      date: new Date().toISOString(),
    });
  }
  const oldBaqaya = parseFloat(c.baqaya);
  if (!isNaN(oldBaqaya) && oldBaqaya > 0) {
    transactions.push({
      id: `mig-b-${Date.now()}`,
      type: "baqaya",
      amount: oldBaqaya,
      note: "Migrated from old data",
      date: new Date().toISOString(),
    });
  }
  const { jama, baqaya, ...rest } = c;
  return { ...rest, transactions };
};

// @ts-ignore
const api = window.electronAPI;

function App() {
  const [lang, setLang] = useState<"ur" | "en">("en");

  const [activeTab, setActiveTab] = useState<"list" | "add">("list");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [currentCustomer, setCurrentCustomer] =
    useState<Customer>(emptyCustomer);
  const [statusMsg, setStatusMsg] = useState("");

  // Transaction form state
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<"jama" | "baqaya">("jama");
  const [txNote, setTxNote] = useState("");

  // Keyboard states
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [layoutName, setLayoutName] = useState("default");
  const keyboardRef = useRef<any>(null);

  const isUrdu = lang === "ur";

  useEffect(() => {
    if (api) {
      api.readData().then((data: any[]) => {
        if (data && Array.isArray(data)) {
          const migrated = data.map(migrateCustomer);
          setCustomers(migrated);
          // Persist migrated data if any customer was migrated
          const needsMigration = data.some(
            (c) => !c.transactions || !Array.isArray(c.transactions),
          );
          if (needsMigration) {
            api.writeData(migrated);
          }
        }
      });

      // Function to trigger auto backup check
      const checkBackup = () => {
        api.checkAutoBackup().then((res: any) => {
          if (res.triggered) {
            console.log("Auto backup created:", res.filePath);
          }
        });
      };

      // Check on launch
      checkBackup();

      // And continuously check every 1 minute while the app is open
      const intervalId = setInterval(checkBackup, 60 * 1000);
      return () => clearInterval(intervalId);
    }
  }, []);

  const labels = {
    appTitle: isUrdu ? "دلکش" : "Dilkash",
    nav_list: isUrdu ? "گاہکوں کی فہرست" : "Customers List",
    nav_add: isUrdu ? "نیا گاہک شامل کریں" : "Add New Customer",
    searchPlaceholder: isUrdu
      ? "نام یا فون نمبر سے تلاش کریں..."
      : "Search by name or phone...",
    saveBtn: isUrdu ? "محفوظ کریں" : "Save Details",
    deleteBtn: isUrdu ? "ختم کریں" : "Delete",
    savedMsg: isUrdu ? "کامیابی سے محفوظ ہو گیا!" : "Saved successfully!",
    emptyList: isUrdu ? "کوئی گاہک نہیں ملا۔" : "No customers found.",
    editTitle: isUrdu ? "گاہک کی تفصیلات درج کریں" : "Enter Customer Details",
    language: isUrdu ? "English" : "اردو",
    fields: {
      name: isUrdu ? "نام" : "Name",
      phone: isUrdu ? "فون نمبر" : "Phone Number",
      address: isUrdu ? "پتہ / تفصیل" : "Address",
      registerNumber: isUrdu
        ? "رجسٹر نمبر / کھاتہ نمبر"
        : "Book/Register Number",
      serialNumber: isUrdu ? "سیریل نمبر / صفحہ" : "Serial Number",
    },
    exportBtn: isUrdu ? "بیک اپ ڈاؤن لوڈ کریں" : "Export Backup",
    importBtn: isUrdu ? "بیک اپ اَپ لوڈ کریں" : "Import Backup",
    // Ledger section labels
    ledger: {
      title: isUrdu ? "کھاتہ / لین دین" : "Khata / Ledger",
      totalJama: isUrdu ? "کل جمع" : "Total Jama",
      totalBaqaya: isUrdu ? "کل بقایا" : "Total Baqaya",
      netBalance: isUrdu ? "خالص بیلنس" : "Net Balance",
      addTransaction: isUrdu ? "نئی انٹری شامل کریں" : "Add Transaction",
      amount: isUrdu ? "رقم" : "Amount",
      type: isUrdu ? "قسم" : "Type",
      jama: isUrdu ? "جمع" : "Jama (Received)",
      baqaya: isUrdu ? "بقایا" : "Baqaya (Due)",
      note: isUrdu ? "نوٹ" : "Note",
      addBtn: isUrdu ? "شامل کریں" : "Add",
      history: isUrdu ? "لین دین کی تاریخ" : "Transaction History",
      date: isUrdu ? "تاریخ / وقت" : "Date / Time",
      emptyHistory: isUrdu
        ? "ابھی تک کوئی لین دین نہیں۔"
        : "No transactions yet.",
      deleteConfirm: isUrdu
        ? "کیا آپ واقعی یہ انٹری حذف کرنا چاہتے ہیں؟"
        : "Are you sure you want to delete this transaction?",
      received: isUrdu ? "وصول" : "Received",
      due: isUrdu ? "واجب" : "Due",
      advance: isUrdu ? "ایڈوانس" : "Advance",
      remaining: isUrdu ? "باقی" : "Remaining",
    },
  };

  // Auto-capitalize first letter after every space
  const toTitleCase = (str: string): string =>
    str.replace(/(^|\s)\S/g, (match) => match.toUpperCase());

  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Customer | "search" | "txNote",
  ) => {
    const value = e.target.value;
    const nativeEvent = e.nativeEvent as InputEvent;

    let newValue = value;

    if (isUrdu && nativeEvent.inputType === "insertText" && nativeEvent.data) {
      const lastChar = nativeEvent.data;
      const mappedChar = urduPhoneticMap[lastChar];
      if (mappedChar) {
        newValue = value.slice(0, -1) + mappedChar;
      }
    }

    // Apply title-case to name, address and notes (not to phone, search, or number fields)
    const titleCaseFields: string[] = ["name", "address"];
    if (!isUrdu && titleCaseFields.includes(field)) {
      newValue = toTitleCase(newValue);
    }

    if (field === "search") {
      setSearch(newValue);
      keyboardRef.current?.setInput(newValue);
    } else if (field === "txNote") {
      if (!isUrdu) newValue = toTitleCase(newValue);
      setTxNote(newValue);
      keyboardRef.current?.setInput(newValue);
    } else {
      setCurrentCustomer({ ...currentCustomer, [field]: newValue });
      keyboardRef.current?.setInput(newValue);
    }
  };

  const handleKeyboardChange = (input: string) => {
    if (focusedInput === "search") {
      setSearch(input);
    } else if (focusedInput === "txNote") {
      setTxNote(input);
    } else if (focusedInput) {
      setCurrentCustomer((prev) => ({ ...prev, [focusedInput]: input }));
    }
  };

  const handleKeyboardKeyPress = (button: string) => {
    if (button === "{shift}" || button === "{lock}") {
      setLayoutName(layoutName === "default" ? "shift" : "default");
    }
    if (button === "{hide}") {
      setFocusedInput(null);
    }
  };

  const onInputFocus = (field: string, currentValue: string) => {
    setFocusedInput(field);
    keyboardRef.current?.setInput(currentValue);
  };

  const saveCustomer = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentCustomer.name) return;

    let updatedCustomers = [...customers];
    if (currentCustomer.id) {
      updatedCustomers = updatedCustomers.map((c) =>
        c.id === currentCustomer.id ? currentCustomer : c,
      );
    } else {
      const newCust = { ...currentCustomer, id: Date.now().toString() };
      updatedCustomers.push(newCust);
      setCurrentCustomer(newCust);
    }

    setCustomers(updatedCustomers);

    if (api) {
      const res = await api.writeData(updatedCustomers);
      if (res.success) {
        setStatusMsg(labels.savedMsg);
        setFocusedInput(null);
        setTimeout(() => setStatusMsg(""), 3000);
        setTimeout(() => setActiveTab("list"), 1000);
      }
    }
  };

  // ── Transaction Actions ──────────────────────────
  const addTransaction = async () => {
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) return;

    const newTx: Transaction = {
      id: Date.now().toString(),
      type: txType,
      amount: amt,
      note: txNote,
      date: new Date().toISOString(),
    };

    const updatedCustomer: Customer = {
      ...currentCustomer,
      transactions: [...currentCustomer.transactions, newTx],
    };

    setCurrentCustomer(updatedCustomer);
    const updatedCustomers = customers.map((c) =>
      c.id === updatedCustomer.id ? updatedCustomer : c,
    );
    setCustomers(updatedCustomers);

    // Reset form
    setTxAmount("");
    setTxNote("");
    setTxType("jama");

    if (api) {
      await api.writeData(updatedCustomers);
    }
  };

  const deleteTransaction = async (txId: string) => {
    const confirmDel = window.confirm(labels.ledger.deleteConfirm);
    if (!confirmDel) return;

    const updatedCustomer: Customer = {
      ...currentCustomer,
      transactions: currentCustomer.transactions.filter((t) => t.id !== txId),
    };

    setCurrentCustomer(updatedCustomer);
    const updatedCustomers = customers.map((c) =>
      c.id === updatedCustomer.id ? updatedCustomer : c,
    );
    setCustomers(updatedCustomers);

    if (api) {
      await api.writeData(updatedCustomers);
    }
  };

  const deleteCustomer = async () => {
    if (!currentCustomer.id) return;
    const confirmDelete = window.confirm(
      isUrdu
        ? "کیا آپ واقعی اس گاہک کو حذف کرنا چاہتے ہیں؟"
        : "Are you sure you want to delete this customer?",
    );
    if (!confirmDelete) return;

    const updatedCustomers = customers.filter(
      (c) => c.id !== currentCustomer.id,
    );
    setCustomers(updatedCustomers);
    setCurrentCustomer(emptyCustomer);
    setActiveTab("list");
    setFocusedInput(null);
    if (api) {
      await api.writeData(updatedCustomers);
    }
  };

  const editCustomer = (cust: Customer) => {
    setCurrentCustomer(cust);
    setActiveTab("add");
    setFocusedInput(null);
  };

  const handleExport = async () => {
    if (api) {
      const res = await api.exportData(customers);
      if (res.success) {
        setStatusMsg(
          isUrdu
            ? "بیک اپ کامیابی سے ایکسپورٹ ہو گیا!"
            : "Exported successfully!",
        );
        setTimeout(() => setStatusMsg(""), 3000);
      }
    }
  };

  const handleImport = async () => {
    if (api) {
      const res = await api.importData();
      if (res.success && Array.isArray(res.data)) {
        setCustomers(res.data);
        setStatusMsg(
          isUrdu
            ? "بیک اپ کامیابی سے امپورٹ ہو گیا!"
            : "Imported successfully!",
        );
        setTimeout(() => setStatusMsg(""), 3000);
      }
    }
  };

  const normalizedSearch = search.toLowerCase().replace(/\s/g, "");

  const filteredCustomers = customers.filter((c) => {
    const nameMatch = c.name.toLowerCase().includes(search.toLowerCase());
    const phoneMatch = c.phone.replace(/\s/g, "").includes(normalizedSearch);
    return nameMatch || phoneMatch;
  });

  const urduKeyboardLayout = {
    default: [
      "۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹ ۰ - = {bksp}",
      "ق و ع ر ت ی ء ا و پ [ ] \\",
      "ا س د ف گ ح ج ک ل ؛ ' {enter}",
      "{shift} ز ش چ ط ب ن م ، . / {shift}",
      "{hide} {space} {hide}",
    ],
    shift: [
      "! @ # $ % ^ & * ) ( _ + {bksp}",
      "ض ص ث ڑ ٹ ے ّ آ ۃ پھ { } |",
      'مد خ ذ ڈ غ ہ ض خ : " {enter}',
      "{shift} ژ ں ظ بھ ں ّ > < ؟ {shift}",
      "{hide} {space} {hide}",
    ],
  };

  return (
    <div
      className={`flex h-screen bg-gray-50 ${isUrdu ? "font-urdu" : "font-sans"} relative`}
      dir={isUrdu ? "rtl" : "ltr"}
    >
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-xl z-20">
        <div className="py-3.5 px-6 bg-indigo-600 text-white shadow-md flex items-center justify-center gap-3">
          <img
            src="./Dilkash.png"
            alt="Logo"
            className="w-13 h-13 object-contain drop-shadow-md"
          />
          <h1 className="text-2xl font-bold tracking-wide">
            {labels.appTitle}
          </h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-3">
          <button
            onClick={() => setActiveTab("list")}
            className={`w-full text-left px-5 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 outline-none cursor-pointer ${activeTab === "list" ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent"}`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              ></path>
            </svg>
            <span className="text-lg">{labels.nav_list}</span>
          </button>

          <button
            onClick={() => {
              setCurrentCustomer(emptyCustomer);
              setActiveTab("add");
            }}
            className={`w-full text-left px-5 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 outline-none cursor-pointer ${activeTab === "add" ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent"}`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              ></path>
            </svg>
            <span className="text-lg">{labels.nav_add}</span>
          </button>
        </nav>

        {/* Options section at the bottom of sidebar */}
        <div className="p-6 border-t border-gray-100 flex flex-col gap-4">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500 mb-3 font-semibold text-center">
              {isUrdu ? "زبان تبدیل کریں" : "Switch Language"}
            </p>
            <button
              onClick={() => setLang(isUrdu ? "en" : "ur")}
              className="w-full bg-white text-indigo-600 border border-indigo-200 font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-50 transition-all outline-none cursor-pointer"
            >
              {labels.language}
            </button>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-2">
            <button
              onClick={handleExport}
              className="w-full bg-indigo-100 text-indigo-700 font-bold py-2 px-4 rounded-lg hover:bg-indigo-200 transition-all text-sm outline-none cursor-pointer"
            >
              {labels.exportBtn}
            </button>
            <button
              onClick={handleImport}
              className="w-full bg-white text-gray-700 border border-gray-300 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition-all text-sm outline-none cursor-pointer"
            >
              {labels.importBtn}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white relative">
        {/* Background Watermark */}
        <div
          className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center"
          style={{ opacity: 0.04 }}
        >
          <img
            src="./Dilkash.png"
            alt=""
            className="w-[500px] h-[500px] object-contain select-none invert"
            draggable={false}
          />
        </div>
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-10 shadow-sm z-10">
          <h2 className="text-2xl font-bold text-gray-800">
            {activeTab === "list" ? labels.nav_list : labels.nav_add}
          </h2>

          {/* Status Toast */}
          <div
            className={`transition-all duration-300 transform ${statusMsg ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"}`}
          >
            <div className="bg-green-500 text-white px-6 py-2 rounded-full shadow-md font-medium flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              {statusMsg}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div
          className={`flex-1 overflow-y-auto p-10 z-10 ${focusedInput && isUrdu ? "pb-64" : ""}`}
        >
          {/* ----- CUSTOMER LIST TAB ----- */}
          {activeTab === "list" && (
            <div className="max-w-5xl mx-auto">
              <div className="mb-8 relative">
                <input
                  type="text"
                  placeholder={labels.searchPlaceholder}
                  value={search}
                  onChange={(e) => handleInput(e, "search")}
                  onFocus={() => onInputFocus("search", search)}
                  className={`w-full px-14 py-4 bg-white border border-gray-300 rounded-2xl outline-none focus:border-indigo-500 transition-all text-lg shadow-sm font-sans ${isUrdu ? "leading-[40px]" : ""} ${isUrdu && !search ? "text-right" : ""}`}
                  dir={isUrdu && !search ? "rtl" : "auto"}
                />
                <svg
                  className="w-6 h-6 text-gray-400 absolute top-1/2 -translate-y-1/2 left-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={isUrdu ? { right: "1rem", left: "auto" } : {}}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  ></path>
                </svg>
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
                  <svg
                    className="w-20 h-20 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    ></path>
                  </svg>
                  <p className="text-xl text-gray-500">{labels.emptyList}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => editCustomer(cust)}
                      className="bg-white p-6 z-10 rounded-3xl bg-white shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer group flex justify-between items-center outline-none"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-xl group-hover:text-indigo-600 transition-colors">
                          {cust.name}
                        </h3>
                        <p
                          className="text-gray-500 mt-2 font-medium bg-gray-100 inline-block px-3 py-1 rounded-lg"
                          dir="ltr"
                        >
                          {cust.phone}
                        </p>
                        {/* Balance indicator */}
                        {cust.transactions &&
                          cust.transactions.length > 0 &&
                          (() => {
                            const net = getNetBalance(cust);
                            const isPositive = net >= 0;
                            return (
                              <div className="mt-2 flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    isPositive
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${isPositive ? "bg-emerald-500" : "bg-red-500"}`}
                                  />
                                  Rs {formatCurrency(Math.abs(net))}{" "}
                                  {isPositive
                                    ? isUrdu
                                      ? "ایڈوانس"
                                      : "Advance"
                                    : isUrdu
                                      ? "باقی"
                                      : "Due"}
                                </span>
                              </div>
                            );
                          })()}
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-full text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex-shrink-0">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={isUrdu ? { transform: "scaleX(-1)" } : {}}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 5l7 7-7 7"
                          ></path>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ----- ADD/EDIT CUSTOMER TAB ----- */}
          {activeTab === "add" && (
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden mb-10">
              <div className="bg-gradient-to-r from-indigo-50 to-white px-10 py-6 border-b border-gray-100">
                <h3 className="text-2xl font-bold text-indigo-900">
                  {labels.editTitle}
                </h3>
              </div>

              <form onSubmit={saveCustomer} className="p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Basic Info */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-gray-100 mb-4">
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                        {labels.fields.name}
                      </label>
                      <input
                        type="text"
                        required
                        value={currentCustomer.name}
                        onChange={(e) => handleInput(e, "name")}
                        onFocus={() =>
                          onInputFocus("name", currentCustomer.name)
                        }
                        // dir="auto"
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 transition-all text-lg shadow-sm outline-none"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                        {labels.fields.phone}
                      </label>
                      <input
                        type="text"
                        value={currentCustomer.phone}
                        onChange={(e) => handleInput(e, "phone")}
                        onFocus={() =>
                          onInputFocus("phone", currentCustomer.phone)
                        }
                        className={`w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 transition-all font-medium shadow-sm outline-none font-sans ${isUrdu ? "text-right" : "text-left"}`}
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Other Fields (address, registerNumber, serialNumber only) */}
                  {(
                    ["address", "registerNumber", "serialNumber"] as Array<
                      keyof Customer
                    >
                  ).map((field) => {
                    const isNumberField =
                      field === "registerNumber" || field === "serialNumber";
                    return (
                      <div key={field} className="space-y-2">
                        <label className="block font-semibold text-gray-600">
                          {labels.fields[field as keyof typeof labels.fields]}
                        </label>
                        <input
                          type="text"
                          value={currentCustomer[field] as string}
                          onChange={(e) => handleInput(e, field)}
                          onFocus={() =>
                            onInputFocus(
                              field,
                              currentCustomer[field] as string,
                            )
                          }
                          className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-indigo-500 transition-all shadow-sm outline-none ${isNumberField ? `font-sans ${isUrdu ? "text-right" : "text-left"}` : ""}`}
                          // dir={isNumberField ? "ltr" : "auto"}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 outline-none cursor-pointer"
                  >
                    {labels.saveBtn}
                  </button>
                  {currentCustomer.id && (
                    <button
                      type="button"
                      onClick={deleteCustomer}
                      className="flex items-center justify-center gap-2 px-8 bg-white border-2 border-red-100 text-red-500 font-bold py-4 rounded-xl hover:bg-red-50 transition-colors outline-none cursor-pointer"
                    >
                      {labels.deleteBtn}
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </form>

              {/* ═══════════════════════════════════════════════════
                  KHATA / LEDGER SECTION — visually separated
                  ═══════════════════════════════════════════════════ */}
              {currentCustomer.id && (
                <div className="border-t-4 border-indigo-200">
                  {/* Ledger Header */}
                  <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-10 py-5 flex items-center gap-3">
                    <svg
                      className="w-7 h-7 text-indigo-200"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <h3 className="text-2xl font-bold text-white">
                      {labels.ledger.title}
                    </h3>
                  </div>

                  <div className="p-10 bg-gradient-to-b from-indigo-50/50 to-white">
                    {/* ── Summary Cards ────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10 animate-fade-in">
                      {/* Total Jama */}
                      <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-emerald-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                          </div>
                          <span className="text-sm font-bold text-emerald-700 uppercase tracking-wide">
                            {labels.ledger.totalJama}
                          </span>
                        </div>
                        <p
                          className="text-3xl font-extrabold text-emerald-600"
                          dir="ltr"
                        >
                          Rs {formatCurrency(getTotalJama(currentCustomer))}
                        </p>
                        <p className="text-xs text-emerald-500 mt-1">
                          {labels.ledger.received}
                        </p>
                      </div>

                      {/* Total Baqaya */}
                      <div className="bg-white rounded-2xl p-6 border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-orange-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M20 12H4"
                              />
                            </svg>
                          </div>
                          <span className="text-sm font-bold text-orange-700 uppercase tracking-wide">
                            {labels.ledger.totalBaqaya}
                          </span>
                        </div>
                        <p
                          className="text-3xl font-extrabold text-orange-600"
                          dir="ltr"
                        >
                          Rs {formatCurrency(getTotalBaqaya(currentCustomer))}
                        </p>
                        <p className="text-xs text-orange-500 mt-1">
                          {labels.ledger.due}
                        </p>
                      </div>

                      {/* Net Balance */}
                      {(() => {
                        const net = getNetBalance(currentCustomer);
                        const isPositive = net >= 0;
                        return (
                          <div
                            className={`rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow ${
                              isPositive
                                ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-300"
                                : "bg-gradient-to-br from-red-50 to-red-100/50 border-red-300"
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  isPositive ? "bg-emerald-200" : "bg-red-200"
                                }`}
                              >
                                <svg
                                  className={`w-5 h-5 ${isPositive ? "text-emerald-700" : "text-red-700"}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                                  />
                                </svg>
                              </div>
                              <span
                                className={`text-sm font-bold uppercase tracking-wide ${
                                  isPositive
                                    ? "text-emerald-700"
                                    : "text-red-700"
                                }`}
                              >
                                {labels.ledger.netBalance}
                              </span>
                            </div>
                            <p
                              className={`text-3xl font-extrabold ${isPositive ? "text-emerald-700" : "text-red-600"}`}
                              dir="ltr"
                            >
                              Rs {formatCurrency(Math.abs(net))}
                            </p>
                            <p
                              className={`text-xs mt-1 ${isPositive ? "text-emerald-600" : "text-red-500"}`}
                            >
                              {isPositive
                                ? labels.ledger.advance
                                : labels.ledger.remaining}
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* ── Add Transaction Form ─────── */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
                      <h4 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-indigo-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {labels.ledger.addTransaction}
                      </h4>

                      <div className="flex flex-col lg:flex-row gap-4 items-end">
                        {/* Amount */}
                        <div className="flex-1 space-y-2">
                          <label className="block text-sm font-semibold text-gray-600">
                            {labels.ledger.amount}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={txAmount}
                            onChange={(e) => setTxAmount(e.target.value)}
                            placeholder="0"
                            dir="ltr"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 transition-all shadow-sm outline-none text-lg font-semibold"
                          />
                        </div>

                        {/* Type Toggle */}
                        <div className="flex-1 space-y-2">
                          <label className="block text-sm font-semibold text-gray-600">
                            {labels.ledger.type}
                          </label>
                          <div className="flex rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                            <button
                              type="button"
                              onClick={() => setTxType("jama")}
                              className={`flex-1 py-3 px-4 font-bold transition-all outline-none cursor-pointer ${
                                txType === "jama"
                                  ? "bg-emerald-500 text-white shadow-inner"
                                  : "bg-gray-50 text-gray-600 hover:bg-emerald-50"
                              }`}
                            >
                              {labels.ledger.jama}
                            </button>
                            <button
                              type="button"
                              onClick={() => setTxType("baqaya")}
                              className={`flex-1 py-3 px-4 font-bold transition-all outline-none cursor-pointer ${
                                txType === "baqaya"
                                  ? "bg-orange-500 text-white shadow-inner"
                                  : "bg-gray-50 text-gray-600 hover:bg-orange-50"
                              }`}
                            >
                              {labels.ledger.baqaya}
                            </button>
                          </div>
                        </div>

                        {/* Note */}
                        <div className="flex-1 space-y-2">
                          <label className="block text-sm font-semibold text-gray-600">
                            {labels.ledger.note}
                          </label>
                          <input
                            type="text"
                            value={txNote}
                            onChange={(e) => handleInput(e, "txNote")}
                            onFocus={() => onInputFocus("txNote", txNote)}
                            // placeholder={isUrdu ? "اختیاری" : "Optional"}
                            placeholder={isUrdu ? "" : "Optional"}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 transition-all shadow-sm outline-none"
                          />
                        </div>

                        {/* Add Button */}
                        <button
                          type="button"
                          onClick={addTransaction}
                          disabled={!txAmount || parseFloat(txAmount) <= 0}
                          className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed outline-none whitespace-nowrap cursor-pointer"
                        >
                          {labels.ledger.addBtn}
                        </button>
                      </div>
                    </div>

                    {/* ── Transaction History ─────── */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <svg
                            className="w-5 h-5 text-indigo-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {labels.ledger.history}
                          <span className="text-sm font-normal text-gray-400 ml-1">
                            ({currentCustomer.transactions.length})
                          </span>
                        </h4>
                      </div>

                      {currentCustomer.transactions.length === 0 ? (
                        <div className="py-16 text-center">
                          <svg
                            className="w-16 h-16 text-gray-200 mx-auto mb-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                          <p className="text-gray-400 text-lg">
                            {labels.ledger.emptyHistory}
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-96 overflow-y-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                              <tr>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-start">
                                  {labels.ledger.date}
                                </th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-start">
                                  {labels.ledger.type}
                                </th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-start">
                                  {labels.ledger.amount}
                                </th>
                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-start">
                                  {labels.ledger.note}
                                </th>
                                <th className="px-6 py-3 w-12"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {[...currentCustomer.transactions]
                                .sort(
                                  (a, b) =>
                                    new Date(b.date).getTime() -
                                    new Date(a.date).getTime(),
                                )
                                .map((tx) => (
                                  <tr
                                    key={tx.id}
                                    className="hover:bg-gray-50/80 transition-colors animate-slide-down"
                                  >
                                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                      {formatDate(tx.date, isUrdu)}
                                    </td>
                                    <td className="px-6 py-4">
                                      <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                          tx.type === "jama"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-orange-100 text-orange-700"
                                        }`}
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            tx.type === "jama"
                                              ? "bg-emerald-500"
                                              : "bg-orange-500"
                                          }`}
                                        />
                                        {tx.type === "jama"
                                          ? labels.ledger.jama
                                          : labels.ledger.baqaya}
                                      </span>
                                    </td>
                                    <td
                                      className="px-6 py-4 font-bold text-gray-800"
                                      // dir="ltr"
                                    >
                                      Rs {formatCurrency(tx.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                                      {tx.note || "—"}
                                    </td>
                                    <td className="px-6 py-4">
                                      <button
                                        type="button"
                                        onClick={() => deleteTransaction(tx.id)}
                                        className="text-gray-300 hover:text-red-500 transition-colors outline-none p-1 cursor-pointer"
                                        title={labels.deleteBtn}
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                          />
                                        </svg>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* On-Screen Keyboard */}
        {isUrdu && focusedInput && (
          <div
            className="absolute bottom-0 left-0 right-0 bg-white shadow-2xl border-t border-gray-200 p-4 z-50 animate-slide-up"
            // dir="ltr"
          >
            <div className="max-w-4xl mx-auto font-urdu text-lg">
              <Keyboard
                keyboardRef={(r) => (keyboardRef.current = r)}
                layoutName={layoutName}
                layout={urduKeyboardLayout}
                onChange={handleKeyboardChange}
                onKeyPress={handleKeyboardKeyPress}
                display={{
                  "{bksp}": "⌫",
                  "{enter}": "شامل کریں",
                  "{shift}": "⇧ Shift",
                  "{space}": "Space",
                  "{lock}": "Caps",
                  "{tab}": "Tab",
                  "{hide}": "چھپائیں ▼",
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
