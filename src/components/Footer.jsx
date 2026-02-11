function Footer() {
	return (
		<footer className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-t border-gray-100 dark:border-slate-700 mt-auto">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
				<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
					<p className="text-sm text-gray-600 dark:text-slate-400 text-center sm:text-left">
						Created by{' '}
						<span className="font-semibold text-gray-900 dark:text-slate-100">
							Joel Breit
						</span>
					</p>
					<div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
						<a
							href="https://joelbreit.com"
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-gray-600 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors duration-200"
						>
							Website
						</a>
						<a
							href="https://github.com/joelbreit"
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-gray-600 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors duration-200"
						>
							GitHub
						</a>
						<a
							href="https://www.linkedin.com/in/joel-breit"
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-gray-600 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors duration-200"
						>
							LinkedIn
						</a>
						<a
							href="mailto:joel@joelbreit.com"
							className="text-sm text-gray-600 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors duration-200"
						>
							Email
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}

export default Footer;
