/** Caminho lógico "pasta/nome" a partir dos metadados ({pasta?, nome?}); sempre com "/" e sem "..". */
export function caminhoDoArquivo(metadados:any,idPadrao:string):string{
    const limpar=(t:unknown)=>String(t ?? "").replace(/\\/g,"/").split("/").filter((p)=>p && p!=="." && p!=="..").join("/")
    const pasta=limpar(metadados?.pasta)
    const nome=limpar(metadados?.nome) || idPadrao
    return pasta ? `${pasta}/${nome}` : nome
}
