import Profissional from "../../Equipe/Modelo/Profissional";
import { ErroValidacao } from "../../erros";
import AdaptadorProfissional from "./AdaptadorProfissional";
import ApiProfissionalExterna from "./simuladores/ApiProfissionalExterna";

/** Template do adaptador: o fluxo é comum; a tradução registro-bruto → Profissional é de cada fonte. */
export default abstract class BaseAdaptadorProfissional implements AdaptadorProfissional{
    constructor(protected api:ApiProfissionalExterna){}
    protected abstract traduzir(registro:any):Profissional
    protected abstract idDoRegistro(registro:any):string

    listarProfissionais(criterios:any):Profissional[]{
        return this.api.buscarProfissionais(criterios ?? {}).map((r)=>this.traduzir(r))
    }
    detalharProfissional(id:string):Profissional{ return this.traduzir(this.api.obterPerfil(id)) }
    /** Aceita um objeto Avaliacao (ou qualquer um com `notaDoProfissional`) ou a nota numérica. */
    registrarAvaliacao(id:string,avaliacao:any):void{
        const nota=typeof avaliacao==="number" ? avaliacao : avaliacao?.notaDoProfissional
        if(typeof nota!=="number" || nota<1 || nota>5) throw new ErroValidacao("Nota da avaliação deve estar entre 1 e 5")
        this.api.avaliarProfissional(id,nota)
    }
}
