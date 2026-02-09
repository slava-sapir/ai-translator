export default function Loading() {

    return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[15px] bg-accent/40 backdrop-blur-[1px]">
        <div className="flex flex-col items-center gap-3 px-6 py-5 shadow">
          <div className="h-50 w-50 animate-spin rounded-full border-10 border-accent/20 border-t-accent" />
          <p className="text-sm font-semibold text-offblack">Translating…</p>
        </div>
    </div>
    )
}