import { useState, useEffect, FormEvent, useRef } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import { urduPhoneticMap } from "./urduMapping";

interface Customer {
  id: string;
  name: string;
  phone: string;
  shirtLength: string;
  shoulders: string;
  arms: string;
  chest: string;
  waist: string;
  hem: string;
  trouserLength: string;
  trouserBottom: string;
  collar: string;
}

const emptyCustomer: Customer = {
  id: "",
  name: "",
  phone: "",
  shirtLength: "",
  shoulders: "",
  arms: "",
  chest: "",
  waist: "",
  hem: "",
  trouserLength: "",
  trouserBottom: "",
  collar: "",
};

// @ts-ignore
const api = window.electronAPI;

function App() {
  const [lang, setLang] = useState<"ur" | "en">("ur");
  const [activeTab, setActiveTab] = useState<"list" | "add">("list");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [currentCustomer, setCurrentCustomer] =
    useState<Customer>(emptyCustomer);
  const [statusMsg, setStatusMsg] = useState("");

  // Keyboard states
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [layoutName, setLayoutName] = useState("default");
  const keyboardRef = useRef<any>(null);

  const isUrdu = lang === "ur";

  useEffect(() => {
    if (api) {
      api.readData().then((data: Customer[]) => {
        if (data && Array.isArray(data)) {
          setCustomers(data);
        }
      });
    }
  }, []);

  const labels = {
    appTitle: isUrdu ? "درزی شاپ" : "Tailor Shop",
    nav_list: isUrdu ? "گاہکوں کی فہرست" : "Customers List",
    nav_add: isUrdu ? "نیا گاہک شامل کریں" : "Add New Customer",
    searchPlaceholder: isUrdu
      ? "نام یا فون نمبر سے تلاش کریں..."
      : "Search by name or phone...",
    saveBtn: isUrdu ? "محفوظ کریں" : "Save Details",
    deleteBtn: isUrdu ? "حذف کریں" : "Delete",
    savedMsg: isUrdu ? "کامیابی سے محفوظ ہو گیا!" : "Saved successfully!",
    emptyList: isUrdu ? "کوئی گاہک نہیں ملا۔" : "No customers found.",
    editTitle: isUrdu ? "گاہک کی تفصیلات درج کریں" : "Enter Customer Details",
    language: isUrdu ? "English" : "اردو",
    fields: {
      name: isUrdu ? "نام" : "Name",
      phone: isUrdu ? "فون نمبر" : "Phone Number",
      shirtLength: isUrdu ? "قمیض کی لمبائی" : "Shirt Length",
      shoulders: isUrdu ? "تیرا" : "Shoulders",
      arms: isUrdu ? "بازو" : "Arms",
      chest: isUrdu ? "چھاتی" : "Chest",
      waist: isUrdu ? "کمر" : "Waist",
      hem: isUrdu ? "گھیرا" : "Hem",
      trouserLength: isUrdu ? "شلوار کی لمبائی" : "Trouser Length",
      trouserBottom: isUrdu ? "پانچا" : "Trouser Bottom",
      collar: isUrdu ? "کالر/بین" : "Collar/Ban",
    },
    exportBtn: isUrdu ? "بیک اپ ڈاؤن لوڈ کریں" : "Export Backup",
    importBtn: isUrdu ? "بیک اپ اَپ لوڈ کریں" : "Import Backup",
  };

  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Customer | "search",
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

    if (field === "search") {
      setSearch(newValue);
      keyboardRef.current?.setInput(newValue);
    } else {
      setCurrentCustomer({ ...currentCustomer, [field]: newValue });
      keyboardRef.current?.setInput(newValue);
    }
  };

  const handleKeyboardChange = (input: string) => {
    if (focusedInput === "search") {
      setSearch(input);
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

  const filteredCustomers = customers.filter(
    (c) => c.name.includes(search) || c.phone.includes(search),
  );

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
      className={`flex h-screen bg-gray-50 ${isUrdu ? "font-urdu" : "font-sans"}`}
      dir={isUrdu ? "rtl" : "ltr"}
    >
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-xl z-20">
        <div className="p-6 bg-indigo-600 text-white shadow-md flex items-center justify-center">
          <h1 className="text-2xl font-bold tracking-wide">
            {labels.appTitle}
          </h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-3">
          <button
            onClick={() => setActiveTab("list")}
            className={`w-full text-left px-5 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 outline-none ${activeTab === "list" ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent"}`}
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
            className={`w-full text-left px-5 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 outline-none ${activeTab === "add" ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent"}`}
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
              className="w-full bg-white text-indigo-600 border border-indigo-200 font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-50 transition-all outline-none"
            >
              {labels.language}
            </button>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-2">
            <button
              onClick={handleExport}
              className="w-full bg-indigo-100 text-indigo-700 font-bold py-2 px-4 rounded-lg hover:bg-indigo-200 transition-all text-sm outline-none"
            >
              {labels.exportBtn}
            </button>
            <button
              onClick={handleImport}
              className="w-full bg-white text-gray-700 border border-gray-300 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 transition-all text-sm outline-none"
            >
              {labels.importBtn}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#f4f7fb] relative">
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
          className={`flex-1 overflow-y-auto p-10 ${focusedInput && isUrdu ? "pb-64" : ""}`}
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
                  className="w-full px-14 py-4 bg-white border border-gray-300 rounded-2xl outline-none focus:border-indigo-500 transition-all text-lg shadow-sm"
                />
                <svg
                  className="w-6 h-6 text-gray-400 absolute top-5 left-4"
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
                      className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer group flex justify-between items-center outline-none"
                    >
                      <div>
                        <h3 className="font-bold text-gray-900 text-xl group-hover:text-indigo-600 transition-colors">
                          {cust.name}
                        </h3>
                        <p
                          className="text-gray-500 mt-2 font-medium bg-gray-100 inline-block px-3 py-1 rounded-lg"
                          // dir="ltr"
                        >
                          {cust.phone}
                        </p>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-full text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
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
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 transition-all text-lg font-medium shadow-sm outline-none"
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
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 transition-all text-lg font-medium shadow-sm outline-none"
                        // dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Measurements */}
                  {(
                    [
                      "shirtLength",
                      "shoulders",
                      "arms",
                      "chest",
                      "waist",
                      "hem",
                      "trouserLength",
                      "trouserBottom",
                      "collar",
                    ] as Array<keyof Customer>
                  ).map((field) => (
                    <div key={field} className="space-y-2">
                      <label className="block font-semibold text-gray-600">
                        {labels.fields[field]}
                      </label>
                      <input
                        type="text"
                        value={currentCustomer[field]}
                        onChange={(e) => handleInput(e, field)}
                        onFocus={() =>
                          onInputFocus(field, currentCustomer[field])
                        }
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-indigo-500 transition-all shadow-sm outline-none"
                        // dir="ltr"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold text-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 outline-none"
                  >
                    {labels.saveBtn}
                  </button>
                  {currentCustomer.id && (
                    <button
                      type="button"
                      onClick={deleteCustomer}
                      className="px-8 bg-white border-2 border-red-100 text-red-500 font-bold py-4 rounded-xl hover:bg-red-50 transition-colors outline-none"
                    >
                      {labels.deleteBtn}
                    </button>
                  )}
                </div>
              </form>
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
