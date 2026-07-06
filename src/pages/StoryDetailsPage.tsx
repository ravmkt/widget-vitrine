import { Link, useParams } from 'react-router-dom';

const storiesMock = [
  {
    id: '1',
    title: 'Story de boas-vindas',
    description: 'Um exemplo de story para apresentar o aplicativo.',
    status: 'Rascunho',
  },
  {
    id: '2',
    title: 'Story promocional',
    description: 'Um exemplo de story voltado para divulgação e campanha.',
    status: 'Em andamento',
  },
  {
    id: '3',
    title: 'Story institucional',
    description: 'Um exemplo de story para comunicação da marca.',
    status: 'Finalizado',
  },
];

const StoryDetailsPage = () => {
  const { id } = useParams();

  const story = storiesMock.find((currentStory) => currentStory.id === id);

  if (!story) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 text-center">
          <h1 className="text-3xl font-bold">Story não encontrado</h1>

          <p className="mt-3 text-sm text-slate-400">
            Não encontramos nenhum story com este identificador.
          </p>

          <Link
            to="/stories"
            className="mt-8 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700"
          >
            Voltar para Stories
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto w-full max-w-5xl px-6 py-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-violet-400">
              Detalhes do story
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {story.title}
            </h1>
          </div>

          <Link
            to="/stories"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Voltar
          </Link>
        </header>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
          <div className="mb-4 inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            {story.status}
          </div>

          <h2 className="text-3xl font-bold">{story.title}</h2>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
            {story.description}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                ID
              </p>
              <p className="mt-2 text-lg font-bold">{story.id}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </p>
              <p className="mt-2 text-lg font-bold">{story.status}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Tipo
              </p>
              <p className="mt-2 text-lg font-bold">Story</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
};

export default StoryDetailsPage;
