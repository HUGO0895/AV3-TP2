import Competencias from '../../Equipe/Modelo/Competencias'
import Equipe from '../../Equipe/Modelo/equipe'
import { Papel } from '../../Equipe/Enum/papel'
import { Genero } from '../Enum/TipoGenero'
import { TipoProjeto } from '../Enum/TipoProjeto'
import Projeto, { AjustesProjeto } from './projetos'

/** Animação: técnica usada (2D, 3D, stop-motion...) e quantidade de cenas a renderizar. */
export default class ProjetoAnimacao extends Projeto{
     public tecnica:string
     public cenas:number

     constructor(id:string,genero:Genero,duracaoMin:number,orcamento:number,prazo:Date,
          competencias?:Map<Papel,Array<Competencias>>,equipe?:Equipe,estrategia?:string,pesos?:Map<Papel,number>,
          tecnica:string='3D',cenas:number=0){
          super(id,genero,duracaoMin,orcamento,prazo,TipoProjeto.ANIMACAO,competencias,equipe,estrategia,pesos)
          this.tecnica=tecnica
          this.cenas=cenas
     }

     public clonar():ProjetoAnimacao{
          const copia=new ProjetoAnimacao(this.getId(),this.genero,this.duracaoMin,this.orcamento,this.prazo,
               undefined,undefined,this.estrategia,undefined,this.tecnica,this.cenas)
          return this.copiarEstadoComum(copia)
     }

     public aplicarAjustes(ajustes:AjustesProjeto):this{
          super.aplicarAjustes(ajustes)
          const d=ajustes.detalhes ?? {}
          if(typeof d.tecnica==='string') this.tecnica=d.tecnica
          if(typeof d.cenas==='number') this.cenas=d.cenas
          return this
     }
}
