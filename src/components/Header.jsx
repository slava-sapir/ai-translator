import headerBg from "../assets/bg-header-narrow.png";
export default function Header() {
    return (
        <header
            className="mb-6 h-28 sm:h-36 bg-center bg-no-repeat bg-cover"
            style={{ backgroundImage: `url(${headerBg})` }}
        >
        </header>
    )
}