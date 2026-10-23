import Competencias from '../../Equipe/Modelo/Competencias'
import Equipe from '../../Equipe/Modelo/equipe'
import { Papel } from '../../Equipe/Enum/papel'
import { Genero } from '../Enum/TipoGenero'
import { TipoProjeto } from '../Enum/TipoProjeto'
import Projeto, { AjustesProjeto } from './projetos'

/** Documentário: além dos dados comuns, tem um tema e a lista de entrevistados. */
export default class ProjetoDocumentario extends Projeto{
     public tema:string
     public entrevistados:string[]

     constructor(id:string,genero:Genero,duracaoMin:number,orcamento:number,prazo:Date,
          competencias?:Map<Papel,Array<Competencias>>,equipe?:Equipe,estrategia?:string,pesos?:Map<Papel,number>,
          tema:string='',entrevistados:string[]=[]){
          super(id,genero,duracaoMin,orcamento,prazo,TipoProjeto.DOCUMENTARIO,competencias,equipe,estrategia,pesos)
          this.tema=tema
          this.entrevistados=entrevistados
     }

     public clonar():ProjetoDocumentario{
          const copia=new ProjetoDocumentario(this.getId(),this.genero,this.duracaoMin,this.orcamento,this.prazo,
               undefined,undefined,this.estrategia,undefined,this.tema,[...this.entrevistados])
          return this.copiarEstadoComum(copia)
     }

     public aplicarAjustes(ajustes:AjustesProjeto):this{
          super.aplicarAjustes(ajustes)
          const d=ajustes.detalhes ?? {}
          if(typeof d.tema==='string') this.tema=d.tema
          if(Array.isArray(d.entrevistados)) this.entrevistados=d.entrevistados.map(String)
          return this
     }
}
