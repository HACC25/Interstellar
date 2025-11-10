from openai import OpenAI

client = OpenAI()
print(client.embeddings.create(
    model="text-embedding-ada-002",
    input=["hello world"]
))
