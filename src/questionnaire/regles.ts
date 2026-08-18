import type { QuestionInput } from "../api.js";

/**
 * Ce qu'un questionnaire doit respecter avant d'être enregistré.
 *
 * Sorti du composant pour deux raisons. Une règle noyée dans cinq cents lignes de
 * rendu ne se relit pas et ne se teste pas séparément. Et celle-ci compte : elle
 * est attrapée devant l'opérateur plutôt que par le membre, qui découvrirait
 * autrement une liste déroulante vide, c'est-à-dire une question à laquelle
 * personne ne peut répondre.
 */

/** Ce qui empêche l'enregistrement, écrit pour être montré tel quel. */
export function refusDEnregistrement(questions: QuestionInput[]): string | null {
  const retenues = questions.filter((q) => q.libelle.trim());
  if (retenues.length === 0) {
    return "Ajoutez au moins une question avant d'enregistrer.";
  }

  // Deux options au minimum : une question à choix unique n'est pas un choix.
  const sansOptions = retenues.find(
    (q) => q.type === "choix" && (q.options ?? []).filter((o) => o.trim()).length < 2,
  );
  if (sansOptions) {
    return `La question « ${sansOptions.libelle} » est de type Choix : `
      + "donnez au moins deux options.";
  }

  return null;
}

/** Les questions réellement enregistrées : celles qui portent un libellé.
 *
 *  Une ligne laissée vide par l'opérateur est un brouillon, pas une question. La
 *  filtrer ici plutôt qu'à l'affichage évite d'envoyer au serveur des lignes qu'il
 *  refuserait, avec un message moins clair que celui d'au-dessus. */
export function questionsRetenues(questions: QuestionInput[]): QuestionInput[] {
  return questions.filter((q) => q.libelle.trim());
}
