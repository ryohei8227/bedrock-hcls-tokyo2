# This Repository demonstrates how to build an AI Agent for interpreting VEP-annotated VCF files for patient IDs

This repository showcases how to create an agent using Amazon Bedrock to support genomics tertiary analysis use-cases. The Agent has two capabilities:

* Analyzing existing VEP-annotated VCFs and providing meaningful interpretation summaries 
* Retrieving existing VEP-annotated reports and extracting information from parsed PDFs

As a prerequisite, you need to have an annotated VCF file in your S3 bucket and a specific prefix to map with a patient ID (Ex: 3186764). This agent recognizes and understands VEP-annotated VCF files. For a given patient ID, the agent reads and interprets queries related to:

   - Variants per chromosome
   - Impact distribution
   - Consequence types
   - Biotypes
   - Gene-specific impacts
   - High-impact variants with details

and in the context of the following:

1. Provides detailed categorization of variants:
   - Coding variants (missense, nonsense, frameshift, etc.)
   - Splice variants
   - Regulatory variants
   - Non-coding variants

2. Tracks gene-level impacts:
   - Counts variants by impact level per gene
   - Stores specific variant details for each gene

3. Includes comprehensive consequence analysis:
   - Breaks down compound consequences
   - Tracks frequency of each consequence type

4. Provides detailed biotype analysis:
   - Tracks different transcript biotypes affected
   - Useful for understanding impact on different types of genes

5. Includes detailed variant information for high and moderate impact variants:
   - Complete location information
   - HGVS notation (both coding and protein level)
   - Exon/Intron information
   - Biotype information

6. Creates a summary section with the most relevant information:
   - Total variant counts
   - Impact distribution
   - Most affected genes
   - Most common consequences

To illustrate this use-case, we use the publicly available HCC1395 breast cancer cell line somatic mutation data detected by the mutect2 tool. We performed VEP analysis to annotate this VCF file and uploaded it to an S3 bucket under a specific patient ID prefix. While annotated VCF files are generally complex and contain detailed insights that are often difficult to extract clinically relevant information from, the agent simplifies the understanding of annotated VCF and responds to clinician and researcher queries.

# Step 0 - Download the data from TCGA and code artifacts and upload to S3

Pick a unique `S3_BUCKET_NAME` and upload your VEP-annotated VCF into a folder with a specific ID using AWS CLI (Ex: aws s3 cp my_vep_annotated_file.vcf.gz s3://my_bucket/my_id/). 

# Step 1 - Deploy the Agent

Follow the `create_agent.ipynb` protocol to deploy your agent

# Step 2 - Test your agent

**Sample Questions:**

```
    1. Which chromosome shows the highest number of high-impact variants?
    2. What are the top 5 genes with the highest frequency of high-impact variants
    3. How are variants distributed by impact type across chromosome 5?
    4. What is the total count of splice region variants in the STAT3 gene?
    5. Which gene exhibits the highest number of stop-gain or stop-loss variants?
    6. Which gene contains the highest frequency of non-coding RNA variants?
    7. Based on protein function loss, which three genes should be prioritized for this patient's analysis?
```

# LICENSE

The codebase relies on external models such as [Anthropic claude 3 sonnet](https://www.anthropic.com/news/claude-3-5-sonnet) subject to Licensing Agreements. The VCF data was generated from raw fastq files from the Registry of Open Data (https://registry.opendata.aws/aws-igenomes/) and can be found [here](s3://ngi-igenomes/test-data/sarek/)

    


