import { Responsavel } from './Responsavel';
import './index.css'; 
import { Header } from './Header'; 
import { Hospedes } from './Hospedes';

function App() {
  return (
    <div className="layout-principal">
      <Header />
      <main className="conteudo-principal">
        <Responsavel />
      </main>
    </div>
  );
}

export default App;