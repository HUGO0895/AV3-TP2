import { ErroValidacao } from '../erros'
import { TipoProjeto } from '../Projetos/Enum/TipoProjeto'
import FabricaAnimacao from './FabricaAnimacao'
import FabricaDocumentario from './FabricaDocumentario'
import FabricaFiccao from './FabricaFiccao'
import FabricaProjeto from './FabricaProjeto'
import FabricaPublicitario from './FabricaPublicitario'

/**
 * Seleciona a fábrica pelo tipo do projeto. É uma tabela, não uma cadeia de if/switch:
 * um tipo novo (ex.: realidade virtual) só precisa de `registrar(new FabricaRealidadeVirtual())`.
 */
export default class RegistroFabricas{
     private fabricas=new Map<TipoProjeto,FabricaProjeto>()

     static padrao():RegistroFabricas{
          return new RegistroFabricas()
               .registrar(new FabricaDocumentario())
               .registrar(new FabricaAnimacao())
               .registrar(new FabricaPublicitario())
               .registrar(new FabricaFiccao())
     }

     registrar(fabrica:FabricaProjeto):this{
          this.fabricas.set(fabrica.tipo,fabrica)
          return this
     }

     obter(tipo:TipoProjeto):FabricaProjeto{
          const fabrica=this.fabricas.get(tipo)
          if(!fabrica) throw new ErroValidacao(`Não há fábrica registrada para o tipo "${tipo}". Disponíveis: ${this.tipos().join(", ")}`)
          return fabrica
     }

     tipos():TipoProjeto[]{
          return Array.from(this.fabricas.keys())
     }
}
