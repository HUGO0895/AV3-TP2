import { ErroNegocio } from '../../erros'
import Projeto, { AjustesProjeto } from './projetos'

/**
 * Prototype Registry: guarda projetos-modelo pelo nome e cria novos por clonagem.
 * Quem chama não sabe (nem precisa saber) qual é a classe concreta do modelo.
 */
export default class RegistroPrototipos{
     private prototipos=new Map<string,Projeto>()

     /** Guarda uma cópia, para que alterações posteriores no original não afetem o modelo. */
     registrar(nome:string,prototipo:Projeto):this{
          this.prototipos.set(nome,prototipo.clonar())
          return this
     }

     nomes():string[]{
          return Array.from(this.prototipos.keys())
     }

     /** Clona o modelo e aplica ajustes finos. O modelo registrado nunca é alterado. */
     criar(nome:string,ajustes:AjustesProjeto={}):Projeto{
          const modelo=this.prototipos.get(nome)
          if(!modelo) throw new ErroNegocio(`Protótipo desconhecido: "${nome}". Disponíveis: ${this.nomes().join(", ") || "(nenhum)"}`)
          return modelo.clonar().aplicarAjustes(ajustes)
     }
}
