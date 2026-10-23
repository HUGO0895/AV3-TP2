import { Papel } from '../../Equipe/Enum/papel'
import Competencias from '../../Equipe/Modelo/Competencias'
import RecomendadorEspecializado from './RecomendadorEspecializado'

/** Animação: prioriza modelagem 3D e efeitos visuais. */
export default class RecomendadorAnimacao extends RecomendadorEspecializado{
     protected prioridades(){
          return {
               [Papel.EFEITOS_VISUAIS]:[new Competencias(4,'Animação 3D'),new Competencias(4,'Efeitos Visuais')],
               [Papel.DIRETOR]:[new Competencias(3,'Animação 3D')],
          }
     }
}
