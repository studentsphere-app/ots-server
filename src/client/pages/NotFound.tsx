import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center justify-center gap-6">
        <div className="flex justify-center">
          <span className="text-6xl font-bold text-[#2A9CB8]">404</span>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {t("not_found.title")}
          </h2>
          <p className="text-center text-sm text-gray-600">
            {t("not_found.desc")}
          </p>
        </div>

        <Link
          to="/"
          className="flex justify-center py-3 px-5 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#37B7D5] hover:bg-[#2A9CB8] focus:outline-none"
        >
          {t("not_found.cta")}
        </Link>
      </div>

      <div className="mt-8">
        <Footer />
      </div>
    </div>
  );
}
