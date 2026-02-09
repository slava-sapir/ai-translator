
import TranslationCard from "./components/translationCard";
import Header from "./components/Header";
import './App.css'

function App() {

  return (
    <main className="container min-h-screen bg-white  p-6 sm:p-10">
      <div className="mx-auto w-full max-w-3xl border-4 border-accent rounded-[15px]">
           <Header />
        <section className="p-5 sm:p-6">
            < TranslationCard />
        </section>
      </div>
    </main>
  );
}

export default App
