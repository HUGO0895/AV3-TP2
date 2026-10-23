import { Papel } from '../../Equipe/Enum/papel'
import Competencias from '../../Equipe/Modelo/Competencias'
import RecomendadorEspecializado from './RecomendadorEspecializado'

/** Documentário: roteiro e edição fazem a obra. */
export default class RecomendadorDocumentario extends RecomendadorEspecializado{
     protected prioridades(){
          return {
               [Papel.ROTEITISTA]:[new Competencias(4,'Roteiro')],
               [Papel.EDITOR]:[new Competencias(4,'Edição')],
          }
     }
}
