import { useParams } from 'react-router-dom';
import StoriesWidgetPage from './StoriesWidgetPage';

/**
 * StoryPreviewPage — thin wrapper around the production widget.
 *
 * This guarantees the preview shows EXACTLY the same result as the final
 * website, because it renders the identical StoriesWidgetPage component.
 * The only difference is that we pass the story ID from the route param
 * so the widget filters to a single story.
 */
const StoryPreviewPage = () => {
  const { id } = useParams<{ id: string }>();
  return <StoriesWidgetPage storyId={id} />;
};

export default StoryPreviewPage;
