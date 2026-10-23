import { Papel } from '../../Equipe/Enum/papel'
import Competencias from '../../Equipe/Modelo/Competencias'
import Profissional from '../../Equipe/Modelo/Profissional'
import Projeto from '../../Projetos/Modelo/projetos'
import RecomendacaoStrategy from '../../Strategy/RecomendacaoStrategy'
import SimiliaridadeCosseno from '../../Strategy/SimiliaridadedeCosseno'
import { normalizarTexto } from '../../Strategy/auxiliares'

/**
 * Recomendador de um tipo de projeto: decora a estratégia escolhida pelo cliente
 * (cosseno, filtragem colaborativa, orçamento) dando prioridade às competências
 * típicas do tipo. Trabalha sobre um CLONE do projeto (Prototype): o original não muda.
 *
 *  - estratégias que comparam competências (cosseno) passam a exigir também as prioritárias;
 *  - nas demais, quem tem as competências prioritárias vem primeiro entre os candidatos (desempate).
 */
export default abstract class RecomendadorEspecializado implements RecomendacaoStrategy{
     constructor(protected readonly base:RecomendacaoStrategy=new SimiliaridadeCosseno()){}

     /** Competências a priorizar por papel (só vale para papéis que o projeto pediu). */
     protected abstract prioridades():Partial<Record<Papel,Competencias[]>>

     recomendar(projeto:Projeto,profissionais:Array<Profissional>):Map<Papel,Profissional>{
          const ajustado=projeto.clonar()
          const prioritarias=this.prioridades()
          for(const [papel,extras] of Object.entries(prioritarias) as Array<[Papel,Competencias[]]>){
               const lista=ajustado.competencias?.get(papel)
               if(!lista) continue
               for(const extra of extras){
                    const existente=lista.find((c)=>normalizarTexto(c.nome)===normalizarTexto(extra.nome))
                    if(!existente) lista.push(new Competencias(extra.nivel,extra.nome))
                    else if(existente.nivel<extra.nivel) existente.nivel=extra.nivel
               }
          }
          return this.base.recomendar(ajustado,this.ordenar(profissionais,prioritarias))
     }

     private ordenar(profissionais:Array<Profissional>,prioritarias:Partial<Record<Papel,Competencias[]>>):Array<Profissional>{
          const nomes=new Set(Object.values(prioritarias).flat().map((c)=>normalizarTexto((c as Competencias).nome)))
          const pontos=(p:Profissional)=>p.competencias.filter((c)=>nomes.has(normalizarTexto(c.nome))).length
          return [...profissionais].sort((a,b)=>pontos(b)-pontos(a))
     }
}
