import Competencias from "../../Equipe/Modelo/Competencias";
import Profissional from "../../Equipe/Modelo/Profissional";
import BaseAdaptadorProfissional from "./BaseAdaptadorProfissional";
import ApiProfissionalExterna from "./simuladores/ApiProfissionalExterna";
import SimuladorInterno from "./simuladores/SimuladorInterno";

export default class AdaptadorInterno extends BaseAdaptadorProfissional{
    constructor(api:ApiProfissionalExterna=new SimuladorInterno()){ super(api) }
    protected idDoRegistro(r:any){ return String(r.id) }
    protected traduzir(r:any):Profissional{
        return new Profissional(this.idDoRegistro(r),r.nome,
            Object.entries(r.competencias as Record<string,number>).map(([nome,nivel])=>new Competencias(nivel,nome)),
            {inicio:new Date(r.inicio),final:new Date(r.fim)},r.preco,[])
    }
}
