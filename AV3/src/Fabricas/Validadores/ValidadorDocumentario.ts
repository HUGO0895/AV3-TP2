import { Papel } from '../../Equipe/Enum/papel'
import ValidadorPorPapeis from './ValidadorPorPapeis'

/** Documentário é decidido na montagem: exige direção e edição. */
export default class ValidadorDocumentario extends ValidadorPorPapeis{
     protected papeisEssenciais():Papel[]{ return [Papel.DIRETOR,Papel.EDITOR] }
}
