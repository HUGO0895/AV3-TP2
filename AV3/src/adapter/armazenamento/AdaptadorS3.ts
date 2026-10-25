import { randomUUID } from "crypto";
import AdaptadorArmazenamento from "./AdaptadorArmazenamento";
import SistemaArmazenamentoExterno from "./simuladores/SistemaArmazenamentoExterno";
import SimuladorS3 from "./simuladores/SimuladorS3";
import { caminhoDoArquivo } from "./auxiliaresArmazenamento";

export default class AdaptadorS3 implements AdaptadorArmazenamento{
    constructor(private sistema:SistemaArmazenamentoExterno=new SimuladorS3()){}
    salvarArquivo(conteudo:Buffer,metadados:any):string{
        const id=caminhoDoArquivo(metadados,randomUUID())
        this.sistema.upload(id,conteudo)
        return id
    }
    recuperarArquivo(id:string):Buffer{ return this.sistema.download(id) }
    listarArquivos(prefixo:string):string[]{ return this.sistema.listar(prefixo) }
}
