import Equipe from '../../Equipe/Modelo/equipe'
import Profissional from '../../Equipe/Modelo/Profissional'
import { Papel } from '../../Equipe/Enum/papel'
import { TipoProjeto } from '../Enum/TipoProjeto'
import { Genero } from '../Enum/TipoGenero'
import Competencias from '../../Equipe/Modelo/Competencias'
import MembroEquipe from '../../Equipe/Modelo/membroEquipe'
import { ErroNegocio } from '../../erros'
import ElementoVisitado from '../../Visitor/ElementoVisitado'
import VisitanteProjeto from '../../Visitor/VisitanteProjeto'
import ServicoProjeto from '../../composite/ServicoProjeto'
/** Campos que podem ser ajustados ao criar um projeto a partir de um protótipo. */
export interface AjustesProjeto {
     id?:string
     genero?:Genero
     duracaoMin?:number
     orcamento?:number
     prazo?:Date
     estrategia?:string
     competencias?:Map<Papel,Array<Competencias>>
     pesos?:Map<Papel,number>
     servicoPrincipal?:ServicoProjeto
     /** Atributos específicos do tipo (tema, entrevistados, cliente...). Ignorados pelo tipo genérico. */
     detalhes?:Record<string,unknown>
}

/**
 * Prototype: `clonar()` devolve uma cópia profunda (competências, pesos e equipe
 * são copiados, não compartilhados). Cada subclasse sobrescreve `clonar()` para
 * devolver o seu próprio tipo, sem que quem clona conheça a classe concreta.
 */
export default class Projeto implements ElementoVisitado{
     private id:string
     public genero:Genero
     public tipo:TipoProjeto
     public duracaoMin:number
     public orcamento:number
     public prazo:Date
     public equipe?:Equipe
     public competencias?:Map<Papel,Array<Competencias>>
     public estrategia?:string
     public pesos?:Map<Papel,number>
     /** Composite: raiz da hierarquia de serviços (pacotes e serviços atômicos) do projeto. */
     public servicoPrincipal?:ServicoProjeto
     constructor(id:string,genero:Genero,duracaoMin:number,orcamento:number,prazo:Date,tipo:TipoProjeto,competencias?:Map<Papel,Array<Competencias>>,equipe?:Equipe,estrategia?:string,pesos?:Map<Papel,number>){
          this.id=id
          this.genero=genero
          this.duracaoMin=duracaoMin
          this.orcamento=orcamento
          this.prazo=prazo
          this.equipe=equipe
          this.tipo=tipo
          this.competencias=competencias
          this.estrategia=estrategia
          this.pesos=pesos
     }
     aceitar(visitante: VisitanteProjeto) {
          return visitante.visitarProjeto(this)
     }

     public getId():string{
          return this.id
     }

     /** Delegado ao serviço principal, que soma recursivamente (0 quando não há serviços). */
     public calcularCustoTotal():number{
          return this.servicoPrincipal?.calcularCusto() ?? 0
     }

     /** Validação recursiva: serviços válidos, dentro do orçamento e com todos os prazos até o prazo do projeto. */
     public validarEstrutura():boolean{
          if(!this.servicoPrincipal) return true
          if(!this.servicoPrincipal.validar()) return false
          if(this.calcularCustoTotal()>this.orcamento) return false
          return this.servicoPrincipal.obterPrazo().every((d)=>d.getTime()<=this.prazo.getTime())
     }

     /** Peso de importância do papel (1 quando não informado). */
     public pesoDe(papel:Papel):number{
          return this.pesos?.get(papel) ?? 1
     }

     /** Confirma um membro sugerido (convite aceito). */
     public aceitarRecomendacao(papel:Papel,profissional:Profissional):void{
          const membro=this.equipe?.membrosEquipe.find((m)=>m.papel===papel && m.profissional.getId()===profissional.getId())
          if(!membro) throw new ErroNegocio(`${profissional.nome} não está recomendado para ${papel}`)
          membro.confirmado=true
     }

     /** Troca o profissional de um papel mantendo os demais membros. */
     public substituirMembro(papel:Papel,profissional:Profissional):void{
          if(!this.equipe) throw new ErroNegocio("O projeto ainda não possui equipe")
          const membro=this.equipe.membrosEquipe.find((m)=>m.papel===papel)
          if(!membro) throw new ErroNegocio(`Não há membro para o papel ${papel}`)
          membro.profissional=profissional
          membro.confirmado=false
     }

     /** Descarta a equipe atual para forçar uma nova rodada completa. */
     public solicitarReavaliacao():void{
          this.equipe=undefined
     }

     /** Prototype: cópia profunda independente do original. */
     public clonar():Projeto{
          const copia=new Projeto(this.id,this.genero,this.duracaoMin,this.orcamento,this.prazo,this.tipo,
               undefined,undefined,this.estrategia,undefined)
          return this.copiarEstadoComum(copia)
     }

     /** Ajuste fino de um clone. Subclasses sobrescrevem para tratar seus atributos específicos. */
     public aplicarAjustes(ajustes:AjustesProjeto):this{
          if(ajustes.id!==undefined) this.id=ajustes.id
          if(ajustes.genero!==undefined) this.genero=ajustes.genero
          if(ajustes.duracaoMin!==undefined) this.duracaoMin=ajustes.duracaoMin
          if(ajustes.orcamento!==undefined) this.orcamento=ajustes.orcamento
          if(ajustes.prazo!==undefined) this.prazo=new Date(ajustes.prazo)
          if(ajustes.estrategia!==undefined) this.estrategia=ajustes.estrategia
          if(ajustes.competencias!==undefined) this.competencias=Projeto.copiarCompetencias(ajustes.competencias)
          if(ajustes.pesos!==undefined) this.pesos=new Map(ajustes.pesos)
          if(ajustes.servicoPrincipal!==undefined) this.servicoPrincipal=ajustes.servicoPrincipal
          return this
     }

     /** Copia profunda dos objetos agregados (usada por `clonar()` de todas as subclasses). */
     protected copiarEstadoComum<T extends Projeto>(destino:T):T{
          destino.prazo=new Date(this.prazo)
          destino.competencias=this.competencias ? Projeto.copiarCompetencias(this.competencias) : undefined
          destino.pesos=this.pesos ? new Map(this.pesos) : undefined
          // Serviços são tratados como imutáveis: o clone compartilha a mesma hierarquia.
          destino.servicoPrincipal=this.servicoPrincipal
          destino.equipe=this.equipe
               ? new Equipe(new Date(this.equipe.dataFormacao),this.equipe.status,
                    this.equipe.membrosEquipe.map((m)=>new MembroEquipe(m.papel,m.confirmado,m.profissional)))
               : undefined
          return destino
     }

     private static copiarCompetencias(origem:Map<Papel,Array<Competencias>>):Map<Papel,Array<Competencias>>{
          return new Map(Array.from(origem.entries()).map(([papel,lista])=>
               [papel,lista.map((c)=>new Competencias(c.nivel,c.nome))] as [Papel,Competencias[]]))
     }
}
