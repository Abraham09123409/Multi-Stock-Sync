import React, { useState } from 'react';
import { Form, Button, ListGroup } from 'react-bootstrap';

interface SearchBarProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
}

/**
 * SearchBar component allows users to input a search query and displays suggestions.
 * 
 * @param {Object} props - Component props
 * @param {string} props.searchQuery - Initial search query
 * @param {function} props.onSearch - Function to handle search action
 * @param {string[]} props.suggestions - List of suggestions to display
 * @param {function} props.onSelectSuggestion - Function to handle suggestion selection
 */
const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, onSearch, suggestions, onSelectSuggestion }) => {
  const [query, setQuery] = useState(searchQuery);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const userInput = event.target.value;
    setQuery(userInput);

    const filtered = suggestions.filter(
      suggestion => suggestion.toLowerCase().indexOf(userInput.toLowerCase()) > -1
    );
    setFilteredSuggestions(filtered);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    onSelectSuggestion(suggestion);
  };

  const handleSearch = () => {
    onSearch(query);
    setQuery(''); // Clear the search bar after search
    setShowSuggestions(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSearch();
  };

  return (
    <div>
      <Form className="d-flex gap-2" onSubmit={handleSubmit}>
        <Form.Control
          type="text"
          placeholder="Buscar productos"
          value={query}
          onChange={handleInputChange}
        />
        <Button variant="outline-success" onClick={handleSearch}>
          Buscar
        </Button>
      </Form>
      {showSuggestions && query && (
        <ListGroup>
          {filteredSuggestions.map((suggestion, index) => (
            <ListGroup.Item key={index} onClick={() => handleSuggestionClick(suggestion)}>
              {suggestion}
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
};

export default SearchBar;
