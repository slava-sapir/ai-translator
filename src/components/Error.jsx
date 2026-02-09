export default function ErrorMessage({ error }) {
    return (        
        <div className="rounded-xl border-4 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {error}
        </div>
    )}