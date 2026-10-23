import Competencias from '../../Equipe/Modelo/Competencias'
import Equipe from '../../Equipe/Modelo/equipe'
import { Papel } from '../../Equipe/Enum/papel'
import { Genero } from '../Enum/TipoGenero'
import { TipoProjeto } from '../Enum/TipoProjeto'
import Projeto, { AjustesProjeto } from './projetos'

/** Publicitário: cliente (marca) e veículos onde será exibido (TV, internet, cinema...). */
export default class ProjetoPublicitario extends Projeto{
     public cliente:string
     public veiculos:string[]

     constructor(id:string,genero:Genero,duracaoMin:number,orcamento:number,prazo:Date,
          competencias?:Map<Papel,Array<Competencias>>,equipe?:Equipe,estrategia?:string,pesos?:Map<Papel,number>,
          cliente:string='',veiculos:string[]=[]){
          super(id,genero,duracaoMin,orcamento,prazo,TipoProjeto.PUBLICITARIO,competencias,equipe,estrategia,pesos)
          this.cliente=cliente
          this.veiculos=veiculos
     }

     public clonar():ProjetoPublicitario{
          const copia=new ProjetoPublicitario(this.getId(),this.genero,this.duracaoMin,this.orcamento,this.prazo,
               undefined,undefined,this.estrategia,undefined,this.cliente,[...this.veiculos])
          return this.copiarEstadoComum(copia)
     }

     public aplicarAjustes(ajustes:AjustesProjeto):this{
          super.aplicarAjustes(ajustes)
          const d=ajustes.detalhes ?? {}
          if(typeof d.cliente==='string') this.cliente=d.cliente
          if(Array.isArray(d.veiculos)) this.veiculos=d.veiculos.map(String)
          return this
     }
}
