nextflow.enable.dsl = 2

// static data files are in nextflow.config
workflow {

    RunDirectedEvolution(
        params.seed_sequence,
        params.esm_model_files,
        params.onehotcnn_model_files,
        params.output_type,
        params.parallel_chains,
        params.n_steps,
        params.max_mutations
    )

}


process RunDirectedEvolution {
    container "${params.container_image}"
    cpus 8
    memory '30 GB'
    accelerator 1, type: 'nvidia-tesla-a10g'
    publishDir '/mnt/workflow/pubdir/de'

    input:
        val seed_sequence
        path esm_model_files
        path onehotcnn_model_files
        val output_type
        val parallel_chains
        val n_steps
        val max_mutations

    output:
        path 'output/*.csv', emit: csvs

    script:
    """
    set -euxo pipefail
    mkdir output
    /opt/conda/bin/python /home/scripts/directed_evolution.py ${seed_sequence} \
        output/ \
        --esm_expert_name_or_path=${esm_model_files} \
        --scorer_expert_name_or_path=${onehotcnn_model_files} \
        --output_type ${output_type}\
        --parallel_chains ${parallel_chains}\
        --n_steps ${n_steps}\
        --max_mutations ${max_mutations}
    """
}
