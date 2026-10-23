import { Papel } from '../../Equipe/Enum/papel'
import Projeto from '../../Projetos/Modelo/projetos'
import ValidadorConscistencia from '../../Visitor/ValidadorConscistencia'

/**
 * Validador de consistência (Visitor) que, além das regras gerais (todos os papéis pedidos
 * preenchidos e orçamento respeitado), exige os papéis essenciais do tipo de projeto.
 */
export default abstract class ValidadorPorPapeis extends ValidadorConscistencia{
     protected abstract papeisEssenciais():Papel[]

     /** Papéis essenciais que a equipe do projeto não cobre. */
     public papeisAusentes(projeto:Projeto):Papel[]{
          const presentes=new Set((projeto.equipe?.membrosEquipe ?? []).map((m)=>m.papel))
          return this.papeisEssenciais().filter((p)=>!presentes.has(p))
     }

     visitarProjeto(projeto:Projeto):boolean{
          return super.visitarProjeto(projeto) && this.papeisAusentes(projeto).length===0
     }
}
