import { useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { Settings, Github, Menu, X } from "lucide-react";

// Sample data for the chart
const data = [
    { name: "Jan", value: 400 },
    { name: "Feb", value: 300 },
    { name: "Mar", value: 600 },
    { name: "Apr", value: 800 },
    { name: "May", value: 500 },
    { name: "Jun", value: 900 },
    { name: "Jul", value: 750 },
    { name: "Aug", value: 850 },
];

function App() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
            {/* Navigation */}
            <nav className="bg-white shadow-sm dark:bg-slate-800">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 text-xl font-bold">
                                React + Tailwind
                            </div>

                            {/* Desktop navigation */}
                            <div className="hidden md:ml-6 md:flex md:space-x-8">
                                <a
                                    href="#"
                                    className="inline-flex items-center border-b-2 border-indigo-500 px-1 pt-1 text-sm font-medium text-slate-900 dark:text-white"
                                >
                                    Dashboard
                                </a>
                                <a
                                    href="#"
                                    className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                                >
                                    Features
                                </a>
                                <a
                                    href="#"
                                    className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                                >
                                    About
                                </a>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <button className="rounded-full bg-slate-100 p-1 text-slate-500 hover:text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:text-white">
                                <span className="sr-only">Settings</span>
                                <Settings className="h-6 w-6" />
                            </button>

                            <a
                                href="https://github.com"
                                className="ml-3 rounded-full bg-slate-100 p-1 text-slate-500 hover:text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:text-white"
                            >
                                <span className="sr-only">GitHub</span>
                                <Github className="h-6 w-6" />
                            </a>

                            {/* Mobile menu button */}
                            <div className="flex items-center md:hidden">
                                <button
                                    type="button"
                                    className="ml-3 inline-flex items-center justify-center rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                                    onClick={() =>
                                        setIsMobileMenuOpen(!isMobileMenuOpen)
                                    }
                                >
                                    <span className="sr-only">
                                        Open main menu
                                    </span>
                                    {isMobileMenuOpen ? (
                                        <X
                                            className="block h-6 w-6"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <Menu
                                            className="block h-6 w-6"
                                            aria-hidden="true"
                                        />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile menu, show/hide based on menu state */}
                {isMobileMenuOpen && (
                    <div className="md:hidden">
                        <div className="space-y-1 pb-3 pt-2">
                            <a
                                href="#"
                                className="block border-l-4 border-indigo-500 bg-indigo-50 py-2 pl-3 pr-4 text-base font-medium text-indigo-700 dark:bg-slate-700 dark:text-white"
                            >
                                Dashboard
                            </a>
                            <a
                                href="#"
                                className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                            >
                                Features
                            </a>
                            <a
                                href="#"
                                className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                            >
                                About
                            </a>
                        </div>
                    </div>
                )}
            </nav>

            {/* Main content */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">
                        Welcome to your React + Tailwind v4 template with
                        Recharts and Lucide icons.
                    </p>
                </div>

                {/* Chart section */}
                <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
                    <h2 className="mb-4 text-xl font-semibold">
                        Monthly Performance
                    </h2>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={data}
                                margin={{
                                    top: 5,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Features grid */}
                <div className="mt-8">
                    <h2 className="mb-4 text-xl font-semibold">
                        Template Features
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            {
                                title: "React",
                                description:
                                    "Build interactive UIs with component-based architecture",
                            },
                            {
                                title: "Tailwind v4",
                                description:
                                    "Utility-first CSS framework for rapid UI development",
                            },
                            {
                                title: "Vite",
                                description:
                                    "Next generation frontend tooling for fast development",
                            },
                            {
                                title: "Recharts",
                                description:
                                    "Redefined chart library built with React and D3",
                            },
                            {
                                title: "Lucide Icons",
                                description:
                                    "Beautiful & consistent icon set with over 1000 icons",
                            },
                            {
                                title: "Responsive Design",
                                description:
                                    "Mobile-first approach for all device sizes",
                            },
                        ].map((feature, index) => (
                            <div
                                key={index}
                                className="rounded-lg bg-white p-6 shadow transition hover:shadow-md dark:bg-slate-800"
                            >
                                <h3 className="text-lg font-medium">
                                    {feature.title}
                                </h3>
                                <p className="mt-2 text-slate-500 dark:text-slate-400">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
