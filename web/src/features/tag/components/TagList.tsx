import { Button } from "@/src/components/ui/button";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { TagButton } from "@/src/features/tag/components/TagButton";

type TagListProps = {
  selectedTags: string[];
  isLoading: boolean;
};

const TagList = ({ selectedTags, isLoading }: TagListProps) => {
  const { t } = useLanguage()
  return selectedTags.length > 0 ? (
    selectedTags.map((tag) => (
      <TagButton key={tag} tag={tag} loading={isLoading} />
    ))
  ) : (
    <Button
      variant="outline"
      size="xs"
      className="text-xs font-bold opacity-0 hover:bg-background hover:opacity-100"
    >
      {t("common.Add tag")}
    </Button>
  );
};

export default TagList;
