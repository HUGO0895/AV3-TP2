import Profissional from "../Equipe/Modelo/Profissional";
import { Papel } from "../Equipe/Enum/papel";
import { novaAvaliacao, novaCompetencia, novoProfissional } from "./factories";

/** Pool pequeno e determinístico: cosseno e filtragem escolhem diretores diferentes. */
export function poolPequeno(): Profissional[] {
  const p = (id: string, nome: string, comp: [string, number][], av: [number, Papel][], preco = 5000) =>
    novoProfissional({
      id, nome, precoMedio: preco,
      competencias: comp.map(([n, v]) => novaCompetencia(n, v)),
      avaliacoes: av.map(([nota, papel]) => novaAvaliacao(nota, papel)),
    });
  return [
    p("1", "Ana Cos", [["Direção", 5]], [[2, Papel.DIRETOR]]),
    p("2", "Bia Col", [["Fotografia", 5]], [[5, Papel.DIRETOR]]),
    p("3", "Caio", [["Edição", 5]], [[4, Papel.EDITOR]]),
    p("4", "Dani", [["Som", 5]], [[4, Papel.SONOPLASTA]]),
    p("5", "Edu", [["Edição", 4], ["Direção", 1]], [[3, Papel.EDITOR], [3, Papel.DIRETOR], [3, Papel.SONOPLASTA]]),
    p("6", "Fabi", [["Som", 4]], [[5, Papel.SONOPLASTA], [4, Papel.EDITOR]]),
    p("7", "Gil", [["Direção", 4]], [[4, Papel.DIRETOR]]),
  ];
}

/** Pool grande (determinístico) para testes de desempenho. */
export function poolGrande(n: number): Profissional[] {
  const nomes = ["Direção", "Edição", "Som", "Fotografia", "Roteiro", "Efeitos Visuais"];
  const papeis = Object.values(Papel);
  let semente = 42;
  const aleatorio = () => (semente = (semente * 1664525 + 1013904223) % 4294967296) / 4294967296;
  return Array.from({ length: n }, (_, i) =>
    novoProfissional({
      id: String(i + 1),
      nome: `Prof ${i + 1}`,
      precoMedio: 2000 + Math.floor(aleatorio() * 8000),
      competencias: [0, 1].map(() => novaCompetencia(nomes[Math.floor(aleatorio() * nomes.length)], 1 + Math.floor(aleatorio() * 5))),
      avaliacoes: [0, 1, 2].map(() => novaAvaliacao(1 + Math.floor(aleatorio() * 5), papeis[Math.floor(aleatorio() * papeis.length)])),
    })
  );
}
